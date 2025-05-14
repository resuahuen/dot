# these paths are checked after the path variable
# ~/.usrbin    contains all binaries compiled for termux
# ~/.shortcuts    contains all binaries which are made available through the termux widget
export PATH=$PATH:~/.usrbin:~/.shortcuts
# run automatically when starting the app
#bash $HOME/.shortcuts/clp
# quick selection of often used directories
cdand() {
  cd "/sdcard/000/"
}
cddwn() {
  cd "/sdcard/Download/"
}
cdknb() {
  cd "/sdcard/000/knb/"
}
cdtmp() {
  cd "/sdcard/000/dev/tmp"
}
cdeth() {
  cd "/sdcard/000/eth/"
}
cdpvt() {
  cd "/sdcard/000/pvt/"
}
cd1() {
  cd "/sdcard/000/eth/001sem/"
}
cd2() {
  cd "/sdcard/000/eth/002sem/"
}
cd3() {
  cd "/sdcard/000/eth/003sem/"
}
cd4() {
  cd "/sdcard/000/eth/004sem/"
}
cd5() {
  cd "/sdcard/000/eth/005sem/"
}
cd6() {
  cd "/sdcard/000/eth/006sem/"
}
cd7() {
  cd "/sdcard/000/eth/007sem/"
}
cdbsc() {
  cd "/sdcard/000/eth/006sem/bsc/"
}
