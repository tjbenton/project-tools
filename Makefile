.DEFAULT_GOAL:= build
MAKEFLAGS = -j1
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))

.PHONY: install build compile watch lint test ci coverage

install:
	@if type yarn 2>/dev/null; then \
		yarn install; \
		npm install ma-shop/lint-rules#v0.1.4 --no-save; \
	else \
		npm install; \
	fi;

clean:
	@rm -rf dist logs

deep-clean:
	@make clean
	@rm -rf node_modules

reinstall setup:
	@make deep-clean install

build compile:
	@make clean
	@babel app --out-dir dist $(args)

watch:
	@make build -- --watch --source-maps

lint:
	@eslint 'app' 'test'

test:
	@ava && ava 'test/cli.test.js'

ci:
	@make lint
	@babel app --out-dir dist --source-maps
	@CI='true' make test

publish release:
	@np $(args)
	@git push --follow-tags origin master

coverage:
	nyc make test