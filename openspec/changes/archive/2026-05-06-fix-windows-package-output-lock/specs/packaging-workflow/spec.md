## ADDED Requirements

### Requirement: Windows package cleanup handles locked output executables
The packaging workflow SHALL stop running AiNote processes from the repository's Windows unpacked output before invoking `electron-builder` for a Windows package.

#### Scenario: Previous unpacked app is running
- **WHEN** a developer starts a Windows package build while `release\win-unpacked\AiNote.exe` from the same repository is running
- **THEN** the workflow terminates that process before `electron-builder` clears the output directory

#### Scenario: Installed app is running outside the repository
- **WHEN** a developer starts a Windows package build while another `AiNote.exe` is running outside this repository's `release\win-unpacked` directory
- **THEN** the workflow leaves that process running

### Requirement: Package cleanup is optional outside Windows
The package cleanup step SHALL be a no-op on non-Windows platforms.

#### Scenario: Non-Windows package script execution
- **WHEN** the cleanup step runs on a non-Windows platform
- **THEN** it exits successfully without attempting Windows process discovery

### Requirement: Local Windows package builds avoid signing discovery
The local Windows package workflow SHALL disable code-signing identity auto-discovery unless a separate release-signing workflow is used.

#### Scenario: Developer lacks symbolic-link privileges
- **WHEN** a developer runs the local Windows package build without symbolic-link privileges
- **THEN** the workflow does not fail while extracting code-signing helper files for certificate discovery
