#!/bin/bash
ares-package ./PlaySync/
ares-install -d tv com.rybel-llc.play-sync_1.0.0_all.ipk
ares-launch -d tv com.rybel-llc.play-sync
ares-inspect --device tv --app com.rybel-llc.play-sync