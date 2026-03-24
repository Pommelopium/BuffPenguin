<#
.SYNOPSIS
    Generates muscle-overlay.svg from the anatomy SVG assets in TopshelfStuff/.
.NOTES
    Run from the repo root:
        powershell -ExecutionPolicy Bypass -File packages/mirror-module/scripts/Build-MuscleOverlay.ps1
#>

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

# --- Paths -------------------------------------------------------------------

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "../../..")).Path
$F_SEP     = Join-Path $RepoRoot "TopshelfStuff\BodyMuscleGroups\Eachmusclegroupseparate_frontmuscle_EPS_PNG_SVG\SVG files"
$B_SEP     = Join-Path $RepoRoot "TopshelfStuff\BodyMuscleGroups\Eachmusclegroupseparate_backmuscle_EPS_PNG_SVG\SVG files"
$OutFile   = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir "..\assets\muscle-overlay.svg"))

# --- File cache --------------------------------------------------------------

$FileCache = @{}

function Get-SvgContent($dir, $file) {
    $p = Join-Path $dir $file
    if (-not $FileCache.ContainsKey($p)) {
        if (Test-Path $p) {
            $FileCache[$p] = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
        } else {
            Write-Warning "  MISSING  $p"
            $FileCache[$p] = ""
        }
    }
    return $FileCache[$p]
}

# --- CSS class analysis ------------------------------------------------------
# Returns which class names (st0, st1...) have reddish fills vs white fills.
# Reddish = R>150, G<110, B<110  ->  highlighted muscle
# White   = #FFFFFF               ->  body silhouette

function Get-CssClasses($svgContent) {
    $red   = [System.Collections.Generic.List[string]]::new()
    $white = [System.Collections.Generic.List[string]]::new()
    if (-not $svgContent) { return @{ Red = @(); White = @() } }

    $sm = [regex]::Match($svgContent, '<style[^>]*>([\s\S]*?)<\/style>')
    if (-not $sm.Success) { return @{ Red = @(); White = @() } }

    $classMatches = [regex]::Matches($sm.Groups[1].Value, '\.([A-Za-z][A-Za-z0-9_-]*)\s*\{([^}]*)\}')
    foreach ($m in $classMatches) {
        $cls   = $m.Groups[1].Value
        $props = $m.Groups[2].Value
        if ($props -match 'display\s*:\s*none') { continue }

        $fm = [regex]::Match($props, 'fill\s*:\s*(#[0-9A-Fa-f]{6})')
        if (-not $fm.Success) { continue }

        $hex = $fm.Groups[1].Value.ToUpper()
        if ($hex -eq '#FFFFFF') { [void]$white.Add($cls); continue }

        $r = [Convert]::ToInt32($hex.Substring(1,2), 16)
        $g = [Convert]::ToInt32($hex.Substring(3,2), 16)
        $b = [Convert]::ToInt32($hex.Substring(5,2), 16)
        if ($r -gt 150 -and $g -lt 110 -and $b -lt 110) { [void]$red.Add($cls) }
    }
    return @{ Red = $red.ToArray(); White = $white.ToArray() }
}

# --- Path extraction ---------------------------------------------------------
# Collect the d-attribute of every <path> whose class is in $targetClasses.

function Get-Paths($svgContent, $targetClasses) {
    if (-not $svgContent -or -not $targetClasses -or $targetClasses.Count -eq 0) { return @() }
    $results = [System.Collections.Generic.List[string]]::new()
    try {
        $xml = [xml]$svgContent
        foreach ($node in $xml.GetElementsByTagName("path")) {
            $cls = $node.GetAttribute("class")
            if ($targetClasses -contains $cls) {
                $d = $node.GetAttribute("d")
                if ($d) { [void]$results.Add(($d -replace '\s+', ' ').Trim()) }
            }
        }
    } catch {
        Write-Warning "  XML parse error: $_"
    }
    return , $results.ToArray()
}

# --- SVG element builders ----------------------------------------------------

# Combine all d-values into one compound path for clean stroke rendering.
function New-MusclePaths($slug, $dValues) {
    if (-not $dValues -or $dValues.Count -eq 0) { return $null }
    $combined = $dValues -join " "
    return "    <path id=""$slug"" class=""muscle-region"" d=""$combined""/>"
}

# Bilateral placeholder: two ellipses mirrored around x=216.
function Bi($cx1, $cx2, $cy, $rx, $ry) {
    $s = "    <g id=""{slug}"" class=""muscle-region"">"
    $s += "`n      <ellipse cx=""$cx1"" cy=""$cy"" rx=""$rx"" ry=""$ry""/>"
    $s += "`n      <ellipse cx=""$cx2"" cy=""$cy"" rx=""$rx"" ry=""$ry""/>"
    $s += "`n    </g>"
    return $s
}

# Single centred placeholder ellipse.
function Mono($cx, $cy, $rx, $ry) {
    return "    <ellipse id=""{slug}"" class=""muscle-region"" cx=""$cx"" cy=""$cy"" rx=""$rx"" ry=""$ry""/>"
}

# --- Muscle mapping ----------------------------------------------------------
# { slug; dir; file }  -> extract red paths from that SVG
# { slug; ph }         -> inline placeholder string  ({slug} replaced at render)

$FRONT = @(
    @{ slug="sternocleidomastoid";    dir=$F_SEP; file="Sternocleidomastoid.svg" }
    @{ slug="pectoralis-major-upper"; dir=$F_SEP; file="Pectoralis Major.svg" }
    @{ slug="pectoralis-major-lower"; dir=$F_SEP; file="Pectoralis Major.svg" }
    @{ slug="serratus-anterior";      dir=$F_SEP; file="Serratus Anterior.svg" }
    @{ slug="anterior-deltoid";       dir=$F_SEP; file="Deltoids.svg" }
    @{ slug="lateral-deltoid";        dir=$F_SEP; file="Deltoids.svg" }
    @{ slug="biceps-brachii";         dir=$F_SEP; file="Biceps brachii.svg" }
    @{ slug="brachialis";             dir=$F_SEP; file="Brachialis.svg" }
    @{ slug="brachioradialis";        dir=$F_SEP; file="Brachioradialis.svg" }
    @{ slug="forearm-flexors";        ph=(Bi 134 298 430 14 26) }
    @{ slug="rectus-abdominis";       dir=$F_SEP; file="Rectus Abdominus.svg" }
    @{ slug="external-obliques";      dir=$F_SEP; file="External obliques.svg" }
    @{ slug="internal-obliques";      ph=(Bi 188 244 272 18 20) }
    @{ slug="transversus-abdominis";  ph=(Mono 216 288 26 14) }
    @{ slug="iliopsoas";              ph=(Bi 192 240 322 14 24) }
    @{ slug="tensor-fasciae-latae";   dir=$F_SEP; file="Tensor fasciae latae.svg" }
    @{ slug="sartorius";              dir=$F_SEP; file="Sartorius.svg" }
    @{ slug="rectus-femoris";         dir=$F_SEP; file="Rectus femoris.svg" }
    @{ slug="vastus-lateralis";       dir=$F_SEP; file="Vastus Lateralis.svg" }
    @{ slug="vastus-medialis";        dir=$F_SEP; file="Vastus Medialis.svg" }
    @{ slug="adductor-magnus";        dir=$F_SEP; file="Adductor Longus and Pectineus.svg" }
    @{ slug="adductor-longus";        dir=$F_SEP; file="Adductor Longus and Pectineus.svg" }
    @{ slug="gracilis";               ph=(Bi 200 232 440 8 42) }
    @{ slug="tibialis-anterior";      ph=(Bi 193 239 545 10 32) }
    @{ slug="peroneus-longus";        dir=$F_SEP; file="Peroneus longus.svg" }
)

$BACK = @(
    @{ slug="upper-trapezius";       dir=$B_SEP; file="Trapezius.svg" }
    @{ slug="middle-trapezius";      dir=$B_SEP; file="Trapezius.svg" }
    @{ slug="lower-trapezius";       dir=$B_SEP; file="Lower Trapezius.svg" }
    @{ slug="rhomboids";             dir=$B_SEP; file="Rhomboid major.svg" }
    @{ slug="posterior-deltoid";     dir=$B_SEP; file="Deltoids.svg" }
    @{ slug="infraspinatus";         dir=$B_SEP; file="Infraspinatus.svg" }
    @{ slug="teres-minor";           ph=(Bi 162 270 230 14 9) }
    @{ slug="teres-major";           dir=$B_SEP; file="Teres major.svg" }
    @{ slug="subscapularis";         ph=(Bi 174 258 218 16 18) }
    @{ slug="latissimus-dorsi";      dir=$B_SEP; file="Lattisimus dorsi.svg" }
    @{ slug="triceps-long-head";     dir=$B_SEP; file="Triceps Brachii ( long head, lateral head ).svg" }
    @{ slug="triceps-lateral-head";  dir=$B_SEP; file="Triceps Brachii ( long head, lateral head ).svg" }
    @{ slug="forearm-extensors";     dir=$B_SEP; file="Extensor carpi radialis.svg" }
    @{ slug="erector-spinae";        ph=(Bi 200 232 280 14 46) }
    @{ slug="multifidus";            ph=(Bi 206 226 302 8 36) }
    @{ slug="quadratus-lumborum";    ph=(Bi 196 236 320 12 18) }
    @{ slug="gluteus-maximus";       dir=$B_SEP; file="Gluteus maximus.svg" }
    @{ slug="gluteus-medius";        dir=$B_SEP; file="Gluteus medius.svg" }
    @{ slug="gluteus-minimus";       ph=(Bi 192 240 392 14 12) }
    @{ slug="piriformis";            ph=(Bi 196 236 416 12 8) }
    @{ slug="biceps-femoris";        dir=$B_SEP; file="Biceps fermoris.svg" }
    @{ slug="semitendinosus";        dir=$B_SEP; file="Semitendinosus.svg" }
    @{ slug="semimembranosus";       ph=(Bi 204 228 472 10 36) }
    @{ slug="gastrocnemius";         dir=$B_SEP; file="Gastrocnemius, lateral head.svg" }
    @{ slug="soleus";                ph=(Bi 200 232 558 14 28) }
)

# --- Section builder ---------------------------------------------------------

function Build-Section($muscles) {
    $lines = [System.Collections.Generic.List[string]]::new()
    foreach ($m in $muscles) {
        $slug = $m.slug

        if ($m.ContainsKey('ph')) {
            [void]$lines.Add(($m.ph -replace '\{slug\}', $slug))
            Write-Host "  placeholder  $slug"
            continue
        }

        $svg     = Get-SvgContent $m.dir $m.file
        $classes = Get-CssClasses $svg
        $dValues = Get-Paths $svg $classes.Red
        $el      = New-MusclePaths $slug $dValues

        if ($el) {
            [void]$lines.Add($el)
            Write-Host "  extracted    $slug  ($($dValues.Count) path(s) from $($m.file))"
        } else {
            [void]$lines.Add("    <!-- $slug : no paths found in $($m.file) - add manually -->")
            Write-Warning "  NO PATHS  $slug  ($($m.file))"
        }
    }
    return $lines -join "`n"
}

# --- Silhouette builder ------------------------------------------------------

function Build-Silhouette($dir, $file) {
    $svg     = Get-SvgContent $dir $file
    $classes = Get-CssClasses $svg
    $dValues = Get-Paths $svg $classes.White

    if (-not $dValues -or $dValues.Count -eq 0) {
        return "    <!-- silhouette: no paths found -->"
    }

    $combined = $dValues -join " "
    return "    <path class=""bp-silhouette"" fill=""#2a2a2a"" opacity=""0.55"" stroke=""none"" d=""$combined""/>"
}

# --- Main --------------------------------------------------------------------

Write-Host ""
Write-Host "Building muscle-overlay.svg ..."
Write-Host ""

Write-Host "Front silhouette ..."
$frontSil = Build-Silhouette $F_SEP "Biceps brachii.svg"

Write-Host "Back silhouette ..."
$backSil  = Build-Silhouette $B_SEP "Gluteus maximus.svg"

Write-Host ""
Write-Host "Front muscles ..."
$frontMuscles = Build-Section $FRONT

Write-Host ""
Write-Host "Back muscles ..."
$backMuscles  = Build-Section $BACK

# Build the SVG as a list of lines to avoid here-string terminator issues.
$svgLines = [System.Collections.Generic.List[string]]::new()
[void]$svgLines.Add('<?xml version="1.0" encoding="UTF-8"?>')
[void]$svgLines.Add('<!--')
[void]$svgLines.Add('  muscle-overlay.svg  -  GENERATED FILE, do not edit by hand.')
[void]$svgLines.Add('  Regenerate: powershell -ExecutionPolicy Bypass -File packages/mirror-module/scripts/Build-MuscleOverlay.ps1')
[void]$svgLines.Add('')
[void]$svgLines.Add('  Layout (viewBox 0 0 864 648):')
[void]$svgLines.Add('    Front (anterior) figure : x 0-432')
[void]$svgLines.Add('    Back  (posterior) figure : x 432-864  (via transform="translate(432,0)")')
[void]$svgLines.Add('')
[void]$svgLines.Add('  Muscle paths extracted from anatomy SVG assets in TopshelfStuff/.')
[void]$svgLines.Add('  Muscles without a source SVG use placeholder ellipses.')
[void]$svgLines.Add('-->')
[void]$svgLines.Add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 864 648">')
[void]$svgLines.Add('')
[void]$svgLines.Add('  <!-- === FRONT (anterior) === -->')
[void]$svgLines.Add('  <g id="front">')
[void]$svgLines.Add($frontSil)
[void]$svgLines.Add('')
[void]$svgLines.Add($frontMuscles)
[void]$svgLines.Add('  </g>')
[void]$svgLines.Add('')
[void]$svgLines.Add('  <!-- === BACK (posterior) === -->')
[void]$svgLines.Add('  <g id="back" transform="translate(432,0)">')
[void]$svgLines.Add($backSil)
[void]$svgLines.Add('')
[void]$svgLines.Add($backMuscles)
[void]$svgLines.Add('  </g>')
[void]$svgLines.Add('')
[void]$svgLines.Add('</svg>')

$svgOut = $svgLines -join "`n"
[System.IO.File]::WriteAllText($OutFile, $svgOut, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "Wrote: $OutFile"
Write-Host "Done."
Write-Host ""
