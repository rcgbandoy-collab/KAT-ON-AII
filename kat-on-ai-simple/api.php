<?php
// Reads the uploaded file, sends the WHOLE text to Groq in parts, merges the results.
require 'config.php';
ini_set('display_errors', 0);
error_reporting(E_ALL);
set_time_limit(300);
header('Content-Type: application/json');

function fail($m) {
    http_response_code(400);
    echo json_encode(['error' => $m]);
    exit;
}

function readUploadedText($tmp, $name) {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    if ($ext === 'txt') {
        $text = @file_get_contents($tmp);
        if ($text === false) {
            return [false, 'Could not read the TXT file.'];
        }
        return [true, (string) $text];
    }

    if (!in_array($ext, ['docx', 'pptx', 'zip'], true)) {
        return [false, 'Please use TXT, DOCX, PPTX or ZIP. For a PDF, copy the text and paste it in the box.'];
    }

    if (!class_exists('ZipArchive')) {
        return [false, 'ZIP support is not available on this server.'];
    }

    $zip = new ZipArchive;
    if ($zip->open($tmp) !== true) {
        return [false, 'Cannot open that file.'];
    }

    $xml = '';
    $foundText = false;

    $docPath = 'word/document.xml';
    if ($zip->locateName($docPath) !== false) {
        $xml = str_replace('</w:p>', "\n", (string) $zip->getFromName($docPath));
        $foundText = true;
    } elseif ($zip->locateName('ppt/presentation.xml') !== false || $zip->locateName('ppt/slides/slide1.xml') !== false) {
        $names = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $n = $zip->getNameIndex($i);
            if (preg_match('#^ppt/slides/slide(\d+)\.xml$#', $n, $m)) {
                $names[(int) $m[1]] = $n;
            }
        }
        ksort($names);
        foreach ($names as $n) {
            $xml .= str_replace('</a:p>', "\n", (string) $zip->getFromName($n));
        }
        $foundText = !empty($xml);
    } elseif ($ext === 'zip') {
        $textFiles = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $n = $zip->getNameIndex($i);
            if (preg_match('/\.txt$/i', $n)) {
                $textFiles[] = $n;
            }
        }
        if (!empty($textFiles)) {
            $xml = (string) $zip->getFromName($textFiles[0]);
            $foundText = true;
        }
    }

    $zip->close();

    if (!$foundText) {
        return [false, 'No readable text was found in that ZIP file.'];
    }

    $text = html_entity_decode(strip_tags($xml));
    return [true, $text];
}

set_error_handler(function ($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR], true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error: ' . $e['message']]);
    }
});

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST request required.');
    }

    $text = trim($_POST['pasted'] ?? '');
    $level = in_array($_POST['level'] ?? '', ['easy', 'medium', 'hard']) ? $_POST['level'] : 'easy';

    if ($text === '' && isset($_FILES['file'])) {
        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            if ($_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) {
                fail('No file was uploaded.');
            }
            fail('File upload failed (error code ' . (int) $_FILES['file']['error'] . ').');
        }

        $tmp = $_FILES['file']['tmp_name'];
        $name = $_FILES['file']['name'];
        [$ok, $fileText] = readUploadedText($tmp, $name);
        if (!$ok) {
            fail($fileText);
        }
        $text = $fileText;
    }

    $text = trim(preg_replace('/[ \t]+/', ' ', $text));
    if (strlen($text) < 50) fail('Not enough text found in the file.');

    $len = mb_strlen($text);
    $size = min(14000, max(8000, (int) ceil($len / 6)));
    $parts = [];
    for ($o = 0; $o < $len && count($parts) < 6; $o += $size) $parts[] = mb_substr($text, $o, $size);

    function build_prompt($i, $n, $level, $part) {
        return "Study material, part $i of $n (difficulty: $level). Use ONLY facts from this part. Return ONLY JSON:
{"title":"","category":"school subject","overview":"2-3 sentences","topics":[""],
"keywords":[{"term":"","definition":"max 12 words","topic":""}],
"quiz":[{"q":"","choices":["","","",""],"answer":0,"topic":""}],
"tf":[{"s":"statement","a":true,"topic":""}],
"blanks":[{"s":"sentence with ____ where the word is missing","a":"missing word","topic":""}],
"ids":[{"kind":"enumeration|identification|definition|listing|person|explanation","q":"","a":"","topic":""}]}
Rules: 2-4 topics. 12 keywords (names, dates, terms, concepts); at least 7 are ONE word of 3-10 letters (letters only, plain ASCII). 8 quiz questions with 4 choices, answer = index 0-3. 6 true/false statements, 6 blanks, 6 IDs. Keep all answers fact-based and brief. Output valid JSON only. Do not include markdown fences or extra text.
MATERIAL:
$part";
    }

    function ask($prompt) {
        for ($try = 0; $try < 2; $try++) {
            $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_TIMEOUT => 120,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . GROQ_API_KEY],
                CURLOPT_POSTFIELDS => json_encode([
                    'model' => GROQ_MODEL,
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'response_format' => ['type' => 'json_object'],
                ]),
            ]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($res === false) return [null, 'Network error: ' . curl_error($ch)];
            if ($code == 429 && $try == 0) { sleep(20); continue; }
            break;
        }
        if ($code == 401) return [null, 'Groq rejected the key. Check GROQ_API_KEY in config.php.'];
        if ($code == 404) return [null, 'Model not found. Check GROQ_MODEL in config.php.'];
        if ($code == 429) return [null, 'Free limit reached. Wait a minute and try again.'];
        if ($code != 200) return [null, "Groq error $code: " . mb_substr($res, 0, 200)];
        $c = (string) (json_decode($res, true)['choices'][0]['message']['content'] ?? '');
        $a = strpos($c, '{'); $b = strrpos($c, '}');
        $d = ($a === false) ? null : json_decode(substr($c, $a, $b - $a + 1), true);
        return is_array($d) ? [$d, ''] : [null, 'AI answered in a bad format. Click Analyze again.'];
    }

    $all = ['title' => '', 'category' => '', 'overview' => '', 'topics' => [], 'keywords' => [], 'quiz' => [], 'tf' => [], 'blanks' => [], 'ids' => []];
    $seen = [];
    foreach ($parts as $i => $part) {
        [$d, $err] = ask(build_prompt($i + 1, count($parts), $level, $part));
        if (!$d) { if ($i == 0) fail($err); break; }
        if ($i == 0) foreach (['title', 'category', 'overview'] as $k) $all[$k] = $d[$k] ?? '';
        foreach (['topics', 'keywords', 'quiz', 'tf', 'blanks', 'ids'] as $k) {
            foreach (($d[$k] ?? []) as $x) {
                $id = $k . '|' . strtolower(is_array($x) ? ($x['term'] ?? $x['q'] ?? $x['s'] ?? json_encode($x)) : $x);
                if (isset($seen[$id])) continue;
                $seen[$id] = 1;
                $all[$k][] = $x;
            }
        }
    }

    if (empty($all['keywords'])) fail('AI answered in a bad format. Click Analyze again.');
    $all['parts'] = count($parts);
    echo json_encode($all, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
