PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))

.PHONY: install build compile watch lint test ci

clean:
	rm -rf dist/*

install:
	npm install

reinstall setup:
	make clean
	rm -rf node_modules
	make install

build compile:
	echo 'run `project build`'

watch:
	echo 'run `project watch`'

lint:
	eslint 'app' 'test'

test:
	ava --verbose

ci ci-test full-test:
	make lint
	make build
	make test
