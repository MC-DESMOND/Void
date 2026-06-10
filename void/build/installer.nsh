!macro customInstall
  ; Add Void to PATH
  DetailPrint "Adding $INSTDIR to PATH..."
  ReadRegStr $0 HKCU "Environment" "Path"
  WriteRegExpandStr HKCU "Environment" "Path" "$0;$INSTDIR"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000

  ; Register Void.Audio file handler
  DetailPrint "Registering file associations..."
  WriteRegStr HKLM "SOFTWARE\Classes\Void.Audio" "" "Audio File"
  WriteRegStr HKLM "SOFTWARE\Classes\Void.Audio\DefaultIcon" "" "$INSTDIR\void.exe,0"
  WriteRegStr HKLM "SOFTWARE\Classes\Void.Audio\shell\open\command" "" '"$INSTDIR\void.exe" "%1"'

  ; Associate audio extensions with Void
  WriteRegStr HKLM "SOFTWARE\Classes\.mp3" "" "Void.Audio"
  WriteRegStr HKLM "SOFTWARE\Classes\.flac" "" "Void.Audio"
  WriteRegStr HKLM "SOFTWARE\Classes\.wav" "" "Void.Audio"
  WriteRegStr HKLM "SOFTWARE\Classes\.ogg" "" "Void.Audio"
  WriteRegStr HKLM "SOFTWARE\Classes\.m4a" "" "Void.Audio"

  ; Notify Windows of the changes
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

!macro customUnInstall
  ; Remove file associations
  DetailPrint "Removing file associations..."
  DeleteRegKey HKLM "SOFTWARE\Classes\Void.Audio"
  DeleteRegValue HKLM "SOFTWARE\Classes\.mp3" ""
  DeleteRegValue HKLM "SOFTWARE\Classes\.flac" ""
  DeleteRegValue HKLM "SOFTWARE\Classes\.wav" ""
  DeleteRegValue HKLM "SOFTWARE\Classes\.ogg" ""
  DeleteRegValue HKLM "SOFTWARE\Classes\.m4a" ""

  ; Notify Windows of the changes
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend