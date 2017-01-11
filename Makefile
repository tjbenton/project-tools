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
	make build -- --watch

lint:
	eslint 'app' 'test'

test:
	ava $(args) && \
	ava $(args) 'test/cli.test.js'

ci:
	make lint
	make build
	CI='true' make test
	CI='false'

VERS := "patch"
TAG := "latest"

publish release:
	git checkout master
	git pull --rebase
	make ci
	npm version $(VERS) -m "Release %s"
	npm publish --tag $(TAG)
	git push --follow-tags origin master
