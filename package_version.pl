#! /usr/bin/perl

open P, "package.json" or die "Unable to read package.json\n";

while (<P>) {
	if (/\"version\":\s*\"([0-9]+\.[0-9]+\.[0-9]+)/) {
		print "$1\n";
		exit 0;
	}
}
exit 1;

