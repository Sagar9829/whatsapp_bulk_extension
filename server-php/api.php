<?php
// WhatsApp Bulk Sender — Dashboard API (PHP, shared hosting / cPanel ke liye)
// Is file ko hosting par daalo + data.json writable rakho (chmod 666 ya folder 777).
// config.js wali apiKey yahan bhi same honi chahiye.

define("API_KEY", "change-this-secret-key");

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Api-Key");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") exit;

$key = $_SERVER["HTTP_X_API_KEY"] ?? ($_GET["key"] ?? "");
if ($key !== API_KEY) { http_response_code(401); echo json_encode(["ok" => false, "error" => "unauthorized"]); exit; }

$file = __DIR__ . "/data.json";
$db = file_exists($file) ? json_decode(file_get_contents($file), true) : null;
if (!is_array($db)) $db = ["activations" => [], "reports" => []];
if (!isset($db["activations"])) $db["activations"] = [];
if (!isset($db["reports"])) $db["reports"] = [];

function save_db($db, $file) { file_put_contents($file, json_encode($db, JSON_PRETTY_PRINT)); }

$action = $_GET["action"] ?? "";
$body = json_decode(file_get_contents("php://input"), true) ?: [];
$now = time() * 1000;

if ($action === "activate" && !empty($body["installId"])) {
    $id = $body["installId"];
    $old = $db["activations"][$id] ?? [];
    $db["activations"][$id] = [
        "installId" => $id,
        "deviceId" => $body["deviceId"] ?? "",
        "client" => $body["client"] ?? [],
        "browser" => $body["browser"] ?? "",
        "platform" => $body["platform"] ?? "",
        "version" => $body["version"] ?? "",
        "firstSeen" => $old["firstSeen"] ?? $now,
        "lastSeen" => $now,
        "online" => !empty($body["online"])
    ];
    save_db($db, $file);
    echo json_encode(["ok" => true]); exit;
}

if ($action === "heartbeat" && !empty($body["installId"])) {
    $id = $body["installId"];
    if (isset($db["activations"][$id])) {
        $db["activations"][$id]["lastSeen"] = $now;
        $db["activations"][$id]["online"] = !empty($body["online"]);
        save_db($db, $file);
    }
    echo json_encode(["ok" => true]); exit;
}

if ($action === "report") {
    $body["ts"] = $body["ts"] ?? $now;
    $db["reports"][] = $body;
    if (count($db["reports"]) > 5000) $db["reports"] = array_slice($db["reports"], -5000);
    save_db($db, $file);
    echo json_encode(["ok" => true]); exit;
}

if ($action === "stats") {
    $acts = array_values($db["activations"]);
    $onlineNow = 0;
    $systems = [];
    $byClient = [];
    foreach ($acts as $a) {
        if (!empty($a["online"]) && ($now - ($a["lastSeen"] ?? 0) < 10 * 60 * 1000)) $onlineNow++;
        $systems[$a["deviceId"] ?? ""] = true;
        $k = ($a["client"]["brand"] ?? "unknown");
        $byClient[$k] = ($byClient[$k] ?? 0) + 1;
    }
    $sent = 0; $failed = 0;
    foreach ($db["reports"] as $r) {
        if (($r["status"] ?? "") === "sent") $sent++;
        if (($r["status"] ?? "") === "failed") $failed++;
    }
    echo json_encode([
        "totalBrowsers" => count($acts),
        "totalSystems" => count($systems),
        "onlineNow" => $onlineNow,
        "byClient" => $byClient,
        "sent" => $sent,
        "failed" => $failed
    ]);
    exit;
}

if ($action === "activations") {
    echo json_encode(array_values($db["activations"])); exit;
}

if ($action === "reports") {
    echo json_encode(array_reverse(array_slice($db["reports"], -200))); exit;
}

echo json_encode(["ok" => false, "error" => "unknown action"]);
