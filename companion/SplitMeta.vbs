Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = appDir & "\dist\SplitMeta.exe"

If Not fso.FileExists(exe) Then
  MsgBox "Run Setup.bat first to install SplitMeta.", vbExclamation, "SplitMeta"
  WScript.Quit 1
End If

shell.Run """" & exe & """", 1, False
