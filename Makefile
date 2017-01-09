.DEFAULT_GOAL:= build
PATH := ./node_modules/.bin:$(PATH)
SHELL := /bin/bash
args = $(filter-out $@, $(MAKECMDGOALS))

.PHONY: install build compile watch lint test ci

install:
	npm install
	# if type yarn 2>/dev/null; then \
	# 	yarn install; \
	# 	echo "because yarn isn't pulling in the correct package"; \
	# 	time npm install ma-shop/lint-rules tjbenton/ava-spec docs-core; \
	# else \
	# 	npm install; \
	# fi

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
	ava $(args) test/cli.test.js

ci:
	make lint
	make build
	make test

VERS := "patch"
TAG := "latest"

publish release:
	git checkout master
	git pull --rebase
	make ci
	npm version $(VERS) -m "Release %s"
	npm publish --tag $(TAG)
	git push --follow-tags origin master
