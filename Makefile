.DEFAULT_GOAL:= build
MAKEFLAGS = -j1
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))

.PHONY: install build compile watch lint test ci

install:
	npm install

clean:
	rm -rf dist logs

deep-clean:
	make clean
	rm -rf node_modules

reinstall setup:
	make deep-clean
	make install

build compile:
	make clean
	babel app --out-dir dist $(args)

watch:
	make build -- --watch --source-maps

lint:
	eslint 'app' 'test'

test:
	ava && ava 'test/cli.test.js'

ci:
	make lint
	babel app --out-dir dist --source-maps
	CI='true' make test
	CI='false'

publish release:
	np $(args)
	git push --follow-tags origin master
