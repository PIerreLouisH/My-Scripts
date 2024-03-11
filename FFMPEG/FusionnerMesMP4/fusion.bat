for %%A IN (*.mp4) DO ffmpeg -i "%%A" -c copy -bsf:v h264_mp4toannexb -f mpegts "%%A.ts"
(FOR /F "delims=" %%A IN ('DIR *.ts /O:D /B /S') DO @ECHO file '%%A') > liste.txt
ffmpeg -f concat -safe 0 -i liste.txt -c copy -bsf:a aac_adtstoasc videofusionnee.mp4
del /S *.ts
del liste.txt