param(
  [string]$Event
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Write-ContinueOutput {
  param([string]$eventName)

  if ($eventName -eq "PreToolUse") {
    $output = @{
      hookSpecificOutput = @{
        hookEventName = "PreToolUse"
        permissionDecision = "allow"
        permissionDecisionReason = "Popup hook notified user"
      }
    }
    $output | ConvertTo-Json -Depth 10 -Compress
    return
  }

  @{ continue = $true } | ConvertTo-Json -Depth 10 -Compress
}

function Read-HookInput {
  try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return $null
    }
    return $raw | ConvertFrom-Json -Depth 20
  }
  catch {
    return $null
  }
}

function Get-FirstValue {
  param(
    [object]$obj,
    [string[]]$paths
  )

  foreach ($path in $paths) {
    $value = $obj
    $ok = $true
    foreach ($part in $path.Split('.')) {
      if ($null -eq $value) {
        $ok = $false
        break
      }
      if ($value.PSObject.Properties.Name -contains $part) {
        $value = $value.$part
      }
      else {
        $ok = $false
        break
      }
    }

    if ($ok -and $null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
      return $value
    }
  }

  return $null
}

function Show-BottomRightForm {
  param(
    [string]$title,
    [string]$message,
    [string[]]$choices,
    [bool]$allowInput
  )

  $form = New-Object System.Windows.Forms.Form
  $form.Text = $title
  $form.Size = New-Object System.Drawing.Size(430, 260)
  $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true
  $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual

  $screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
  $form.Location = New-Object System.Drawing.Point($screen.Right - $form.Width - 16, $screen.Bottom - $form.Height - 16)

  $label = New-Object System.Windows.Forms.Label
  $label.Text = $message
  $label.AutoSize = $false
  $label.Width = 390
  $label.Height = 70
  $label.Location = New-Object System.Drawing.Point(15, 15)
  $form.Controls.Add($label)

  if ($choices.Count -gt 0) {
    $combo = New-Object System.Windows.Forms.ComboBox
    $combo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
    $combo.Width = 390
    $combo.Location = New-Object System.Drawing.Point(15, 90)
    foreach ($choice in $choices) {
      [void]$combo.Items.Add($choice)
    }
    if ($combo.Items.Count -gt 0) {
      $combo.SelectedIndex = 0
    }
    $form.Controls.Add($combo)
  }

  if ($allowInput) {
    $input = New-Object System.Windows.Forms.TextBox
    $input.Width = 390
    $input.Location = New-Object System.Drawing.Point(15, 130)
    $form.Controls.Add($input)
  }

  $button = New-Object System.Windows.Forms.Button
  $button.Text = "Done"
  $button.Width = 120
  $button.Location = New-Object System.Drawing.Point(285, 180)
  $button.Add_Click({
    $form.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Close()
  })

  $form.AcceptButton = $button
  $form.Controls.Add($button)

  [void]$form.ShowDialog()
}

$payload = Read-HookInput

if ($Event -eq "Stop") {
  Show-BottomRightForm -title "Copilot Task Complete" -message "The current task is complete. Click the button to close this popup." -choices @() -allowInput $false
  Write-Output (Write-ContinueOutput -eventName "Stop")
  exit 0
}

if ($Event -eq "PreToolUse") {
  $toolName = Get-FirstValue -obj $payload -paths @(
    "toolName",
    "tool_name",
    "tool.name",
    "request.toolName",
    "request.tool.name"
  )

  if ($toolName -and ($toolName -match "askQuestions|vscode_askQuestions")) {
    $questions = Get-FirstValue -obj $payload -paths @(
      "toolInput.questions",
      "input.questions",
      "arguments.questions",
      "request.toolInput.questions"
    )

    if ($questions -and $questions.Count -gt 0) {
      $firstQuestion = $questions[0]
      $questionText = Get-FirstValue -obj $firstQuestion -paths @("question")
      if (-not $questionText) {
        $questionText = "The agent is waiting for your input."
      }

      $allowFreeform = $true
      $allowFreeformValue = Get-FirstValue -obj $firstQuestion -paths @("allowFreeformInput")
      if ($null -ne $allowFreeformValue) {
        $allowFreeform = [bool]$allowFreeformValue
      }

      $choices = @()
      $opts = Get-FirstValue -obj $firstQuestion -paths @("options")
      if ($opts) {
        foreach ($opt in $opts) {
          $label = Get-FirstValue -obj $opt -paths @("label", "value")
          if ($label) {
            $choices += [string]$label
          }
        }
      }

      Show-BottomRightForm -title "Copilot Needs Input" -message $questionText -choices $choices -allowInput $allowFreeform
    }
    else {
      Show-BottomRightForm -title "Copilot Needs Input" -message "The agent is requesting your confirmation or input." -choices @() -allowInput $true
    }
  }

  Write-Output (Write-ContinueOutput -eventName "PreToolUse")
  exit 0
}

Write-Output (Write-ContinueOutput -eventName $Event)
exit 0
