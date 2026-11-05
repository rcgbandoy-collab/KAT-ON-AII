<?php
// Reads the uploaded file, sends the WHOLE text to Groq in parts, merges the results.
require 'config.php';
ini_set('display_errors', 0);
set_time_limit(300);
header('Content-Type: application/json');
function fail($m) { echo json_encode(['error' => $m]); exit; }

$text = trim($_POST['pasted'] ?? '');
$level = in_array($_POST['level'] ?? '', ['easy', 'medium', 'hard']) ? $_POST['level'] : 'easy';

if ($text === '' && isset($_FILES['file']) && $_FILES['file']['error'] === 0) {
    $tmp = $_FILES['file']['tmp_name'];
    $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    if ($ext === 'txt') {
        $text = file_get_contents($tmp);
    } elseif ($ext === 'docx' || $ext === 'pptx') {
        $zip = new ZipArchive;
        if ($zip->open($tmp) !== true) fail('Cannot open that file.');
        $xml = '';
        if ($ext === 'docx') {
            $xml = str_replace('</w:p>', "\n", (string) $zip->getFromName('word/document.xml'));
        } else {
            $names = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $n = $zip->getNameIndex($i);
                if (preg_match('#^ppt/slides/slide(\d+)\.xml$#', $n, $m)) $names[(int) $m[1]] = $n;
            }
            ksort($names);
            foreach ($names as $n) $xml .= str_replace('</a:p>', "\n", $zip->getFromName($n));
        }
        $text = html_entity_decode(strip_tags($xml));
    } else {
        fail('Please use TXT, DOCX or PPTX. For a PDF, copy the text and paste it in the box.');
    }
}
$text = trim(preg_replace('/[ \t]+/', ' ', $text));
if (strlen($text) < 50) fail('Not enough text found in the file.');

// cut the whole document into up to 6 parts
$len = mb_strlen($text);
$size = min(14000, max(8000, (int) ceil($len / 6)));
$parts = [];
for ($o = 0; $o < $len && count($parts) < 6; $o += $size) $parts[] = mb_substr($text, $o, $size);

function build_prompt($i, $n, $level, $part) {
    return "Study material, part $i of $n (difficulty: $level). Use ONLY facts from this part. Return ONLY JSON:
{\"title\":\"\",\"category\":\"school subject\",\"overview\":\"2-3 sentences\",\"topics\":[\"\"],
\"keywords\":[{\"term\":\"\",\"definition\":\"max 12 words\",\"topic\":\"\"}],
\"quiz\":[{\"q\":\"\",\"choices\":[\"\",\"\",\"\",\"\"],\"answer\":0,\"topic\":\"\"}],
\"tf\":[{\"s\":\"statement\",\"a\":true,\"topic\":\"\"}],
\"blanks\":[{\"s\":\"sentence with ____ where the word is missing\",\"a\":\"missing word\",\"topic\":\"\"}],
\"ids\":[{\"kind\":\"enumeration|identification|definition|listing|person|explanation\",\"q\":\"\",\"a\":\"\",\"topic\":\"\"}]}
Rules: 2-4 topics. 12 keywords (names, dates, terms, concepts); at least 7 are ONE word of 3-10 letters (letters only, plain ASCII). 8 quiz questions with 4 choices, answer = index 0-3. 6 true/false (about half false). 6 blanks (missing word = 1-2 words from the text). 8 ids using every kind: enumeration 'What are the types of...?', identification 'It is known as...', definition 'It is called...', listing 'What are the...?', person 'Who is...?', explanation 'Why does...?'. For enumeration and listing, a = 2-5 items separated by semicolons. For explanation, a = short answer, max 12 words. Use plain ASCII hyphens and quotes. Every topic must come from your topics list.
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
            CURLOPT_SSL_VERIFYPEER => false, // OK for a local prototype only
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
    if (!$d) { if ($i == 0) fail($err); break; }   // later parts failed: keep what we already have
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
echo json_encode($all);