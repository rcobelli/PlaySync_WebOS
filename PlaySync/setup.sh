#!/bin/bash
# npm install -g @webos-tools/cli
ares-setup-device -a tv -i "username=prisoner" -i "host=192.168.0.111" -i "port=9922"
ares-setup-device -f tv
# echo "Enable the key-server on the tv & enter the passphrase:"
# read -r passphrase
read -p "Enable the key-server on the tv"
ares-novacom --device tv --getkey
# ares-setup-device -m DEVICE -i "password=$passphrase"
