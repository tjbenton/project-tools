PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))

.PHONY: install build compile watch lint test ci

install:
	npm install

clean:
	rm -rf dist

reinstall rebuild setup:
	make clean
	rm -rf node_modules
	make install

build compile:
	rm -rf dist/*
	babel app --out-dir dist $(args)

watch:
	make build -- --watch

lint:
	eslint 'app' 'test'


test:
	ava $(args) && \
	ava $(args) test/cli.test.js

ci:
	make lint
	make build
	make test
