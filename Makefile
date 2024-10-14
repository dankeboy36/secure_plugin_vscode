
VERSION := $(shell /usr/bin/perl package_version.pl)

all: teensysecurity-$(VERSION).vsix

teensysecurity-$(VERSION).vsix: package.json src/extension.ts node_modules
	vsce package

node_modules:
	npm install

install: all
	rm -rf /tmp/vscode-unpacked/
	mkdir -p ~/.arduinoIDE/plugins
	rm -f ~/.arduinoIDE/plugins/teensysecurity-*.vsix
	cp teensysecurity-$(VERSION).vsix ~/.arduinoIDE/plugins

clean:
	rm -rf *.vsix out dist node_modules
