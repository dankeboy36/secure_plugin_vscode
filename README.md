# Teensy Security Plugin for Arduino IDE 2.x

This plugin supports use of [code security on Teensy 4.x](https://www.pjrc.com/teensy/td_code_security.html) by adding 4 commands to Arduino IDE.  They are accessed by pressing Ctrl-Shift-P (or Command-Shift-P on MacOS).

![](img/screenshot_commands.png)

## Generate Key

The Generate Key creates a new private key.  This key is required before using the other commands.  If you already created a key, with this plugin or using the "Teensy 4 Security" plugin with Arduino 1.8.x, your prior key.pem file will be renamed.

![](img/screenshot_keygen.png)

Back up your key.pem file!  If you lose this file, you will no longer be able to compile programs which will run on all Teensy boards locked with your key.

## Step 1, 2, 3

These 3 commands create the 3 sketches needed to write your key to the Teensy permanent fuse memory, verify encryption works, and permanently lock Teensy into secure mode.

![](img/screenshot_fusewrite.png)



