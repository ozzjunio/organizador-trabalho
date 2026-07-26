<#
Servidor estático local, sem dependências (usa HttpListener do .NET).
Uso:  powershell -File serve.ps1 [-Port 5500]
Depois abra http://localhost:5500 no navegador.
#>
param(
    [int]$Port = 5500
)

$root = $PSScriptRoot
$prefix = "http://localhost:$Port/"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
    ".webmanifest" = "application/manifest+json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Error "Nao foi possivel iniciar o servidor em $prefix. Detalhe: $($_.Exception.Message)"
    exit 1
}

Write-Host "Servindo '$root' em $prefix (Ctrl+C para parar)"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            $localPath = $request.Url.LocalPath
            if ($localPath -eq "/") { $localPath = "/index.html" }

            $filePath = Join-Path $root ($localPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar)
            $fullRoot = [System.IO.Path]::GetFullPath($root)
            $fullFile = [System.IO.Path]::GetFullPath($filePath)

            if (-not $fullFile.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                $response.StatusCode = 403
                $response.Close()
                continue
            }

            if (Test-Path $fullFile -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($fullFile).ToLowerInvariant()
                $contentType = $mimeTypes[$ext]
                if (-not $contentType) { $contentType = "application/octet-stream" }

                $bytes = [System.IO.File]::ReadAllBytes($fullFile)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - arquivo nao encontrado: $localPath")
                $response.ContentLength64 = $notFound.Length
                $response.OutputStream.Write($notFound, 0, $notFound.Length)
            }
        } catch {
            $response.StatusCode = 500
        } finally {
            $response.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
