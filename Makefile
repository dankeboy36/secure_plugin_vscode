all: teensysecurity-0.0.1.vsix

teensysecurity-0.0.1.vsix: package.json src/extension.ts
	npm install
	vsce package

clean:
	rm -rf *.vsix out dist node_modules
