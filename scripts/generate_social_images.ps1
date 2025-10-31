Set-StrictMode -Version Latest

Add-Type -AssemblyName System.Drawing

function New-Brush {
    param(
        [string]$Hex
    )

    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Hex))
}

function Draw-Text {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Text,
        [string]$FontName,
        [single]$Size,
        [bool]$Bold,
        [string]$ColorHex,
        [single[]]$Rect,
        [System.Drawing.StringAlignment]$Align
    )

    $style = if ($Bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
    $font = New-Object System.Drawing.Font($FontName, $Size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Brush $ColorHex
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = $Align
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $rectangle = New-Object System.Drawing.RectangleF($Rect[0], $Rect[1], $Rect[2], $Rect[3])
    $Graphics.DrawString($Text, $font, $brush, $rectangle, $format)

    $font.Dispose()
    $brush.Dispose()
    $format.Dispose()
}

$slides = @(
    @{
        File  = 'marketing/redes-sociais/fgts-saque-aniversario-slide1.png'
        Size  = @(1080, 1080)
        Bg    = '#FFA500'
        Blocks = @(
            @{ Text = 'Transforme seu FGTS'; FontSize = 90; Bold = $true; Color = '#FFFFFF'; Rect = @(60, 160, 960, 200); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'em alívio na conta'; FontSize = 76; Bold = $true; Color = '#FFFFFF'; Rect = @(60, 360, 960, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Antecipe com a JD CRED VIP'; FontSize = 48; Bold = $false; Color = '#FFFFFF'; Rect = @(60, 600, 960, 160); Align = [System.Drawing.StringAlignment]::Center }
        )
    },
    @{
        File  = 'marketing/redes-sociais/fgts-saque-aniversario-slide2.png'
        Size  = @(1080, 1080)
        Bg    = '#89CFF0'
        Blocks = @(
            @{ Text = 'Como funciona?'; FontSize = 90; Bold = $true; Color = '#000000'; Rect = @(80, 160, 920, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Você antecipa as parcelas do Saque-Aniversário com total segurança.'; FontSize = 52; Bold = $false; Color = '#000000'; Rect = @(100, 360, 880, 280); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Dinheiro cai direto na conta.'; FontSize = 48; Bold = $true; Color = '#000000'; Rect = @(100, 660, 880, 140); Align = [System.Drawing.StringAlignment]::Center }
        )
    },
    @{
        File  = 'marketing/redes-sociais/fgts-saque-aniversario-slide3.png'
        Size  = @(1080, 1080)
        Bg    = '#FFFFFF'
        Blocks = @(
            @{ Text = 'Quem pode?'; FontSize = 90; Bold = $true; Color = '#FFA500'; Rect = @(80, 160, 920, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Trabalhadores com carteira assinada que já aderiram ao Saque-Aniversário.'; FontSize = 52; Bold = $false; Color = '#333333'; Rect = @(120, 360, 840, 320); Align = [System.Drawing.StringAlignment]::Center }
        )
    },
    @{
        File  = 'marketing/redes-sociais/fgts-saque-aniversario-slide4.png'
        Size  = @(1080, 1080)
        Bg    = '#89CFF0'
        Blocks = @(
            @{ Text = 'Por que com a gente?'; FontSize = 80; Bold = $true; Color = '#000000'; Rect = @(80, 140, 920, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = '✅ responsável autorizado'; FontSize = 56; Bold = $false; Color = '#000000'; Rect = @(140, 360, 800, 120); Align = [System.Drawing.StringAlignment]::Near; FontName = 'Segoe UI Emoji' },
            @{ Text = '✅ atendimento acolhedor'; FontSize = 56; Bold = $false; Color = '#000000'; Rect = @(140, 480, 800, 120); Align = [System.Drawing.StringAlignment]::Near; FontName = 'Segoe UI Emoji' },
            @{ Text = '✅ dinheiro liberado rapidinho'; FontSize = 56; Bold = $false; Color = '#000000'; Rect = @(140, 600, 800, 120); Align = [System.Drawing.StringAlignment]::Near; FontName = 'Segoe UI Emoji' }
        )
    },
    @{
        File  = 'marketing/redes-sociais/fgts-saque-aniversario-slide5.png'
        Size  = @(1080, 1080)
        Bg    = '#FFA500'
        Blocks = @(
            @{ Text = 'Bora conversar?'; FontSize = 88; Bold = $true; Color = '#FFFFFF'; Rect = @(80, 200, 920, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'A gente explica, você decide. Transparência sempre.'; FontSize = 52; Bold = $false; Color = '#FFFFFF'; Rect = @(100, 420, 880, 200); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = '➡️ Saiba mais e simule no WhatsApp: 84 98856-2331'; FontSize = 48; Bold = $true; Color = '#FFFFFF'; Rect = @(90, 660, 900, 160); Align = [System.Drawing.StringAlignment]::Center; FontName = 'Segoe UI Emoji' }
        )
    },
    @{
        File  = 'marketing/redes-sociais/conta-luz-reels-capa.png'
        Size  = @(1080, 1920)
        Bg    = '#FFA500'
        Blocks = @(
            @{ Text = 'Conta de luz em dia?'; FontSize = 96; Bold = $true; Color = '#FFFFFF'; Rect = @(100, 200, 880, 240); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Pode virar crédito justo!'; FontSize = 88; Bold = $true; Color = '#FFFFFF'; Rect = @(100, 480, 880, 220); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Use sua fatura pra garantir empréstimo sem enrolação.'; FontSize = 60; Bold = $false; Color = '#FFFFFF'; Rect = @(120, 820, 840, 260); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'JD CRED VIP cuida de você do início ao fim.'; FontSize = 60; Bold = $false; Color = '#FFFFFF'; Rect = @(120, 1120, 840, 220); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = '➡️ WhatsApp: 84 98856-2331'; FontSize = 72; Bold = $true; Color = '#FFFFFF'; Rect = @(100, 1500, 880, 200); Align = [System.Drawing.StringAlignment]::Center; FontName = 'Segoe UI Emoji' }
        )
    },
    @{
        File  = 'marketing/redes-sociais/bolsa-familia-facebook-post.png'
        Size  = @(1080, 1080)
        Bg    = '#FFFFFF'
        Blocks = @(
            @{ Text = 'Crédito pra quem recebe'; FontSize = 80; Bold = $true; Color = '#FFA500'; Rect = @(80, 160, 920, 160); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Bolsa Família'; FontSize = 120; Bold = $true; Color = '#89CFF0'; Rect = @(80, 320, 920, 180); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Orientação completa, parcelas suaves, atendimento acolhedor.'; FontSize = 52; Bold = $false; Color = '#333333'; Rect = @(120, 540, 840, 200); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = '➡️ WhatsApp: 84 98856-2331'; FontSize = 56; Bold = $true; Color = '#FFA500'; Rect = @(100, 780, 880, 160); Align = [System.Drawing.StringAlignment]::Center; FontName = 'Segoe UI Emoji' }
        )
    },
    @{
        File  = 'blog/imagens/fgts-urgencia-31-10.png'
        Size  = @(1200, 675)
        Bg    = '#FFA500'
        Blocks = @(
            @{ Text = 'URGENTE: Regras do FGTS mudam em 1º/11'; FontSize = 96; Bold = $true; Color = '#FFFFFF'; Rect = @(60, 90, 1080, 200); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = "Até 31/10 você antecipa sem carência,\nlibera valores maiores e faz tudo com a JD CRED VIP."; FontSize = 56; Bold = $false; Color = '#FFFFFF'; Rect = @(100, 280, 1000, 220); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = 'Novas regras: carência de 90 dias · limite R$500 por parcela · 1 operação por ano'; FontSize = 48; Bold = $false; Color = '#FFFFFF'; Rect = @(100, 470, 1000, 140); Align = [System.Drawing.StringAlignment]::Center },
            @{ Text = '➡️ Simule no WhatsApp: 84 98856-2331'; FontSize = 60; Bold = $true; Color = '#FFFFFF'; Rect = @(100, 560, 1000, 100); Align = [System.Drawing.StringAlignment]::Center; FontName = 'Segoe UI Emoji' }
        )
    }
)

foreach ($slide in $slides) {
    $width = $slide.Size[0]
    $height = $slide.Size[1]

    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($slide.Bg))

    foreach ($block in $slide.Blocks) {
        $fontName = if ($block.ContainsKey('FontName') -and $block.FontName) { $block.FontName } else { 'Arial' }
        Draw-Text -Graphics $graphics -Text $block.Text -FontName $fontName -Size $block.FontSize -Bold $block.Bold -ColorHex $block.Color -Rect $block.Rect -Align $block.Align
    }

    $dir = Split-Path $slide.File -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    $bitmap.Save($slide.File, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
