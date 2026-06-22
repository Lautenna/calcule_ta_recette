.PHONY: install start-back start-front migrate cc test

install:
	cd backend && composer install
	cd frontend && npm install

start-back:
	cd backend && symfony server:start

start-front:
	cd frontend && npm run dev

migrate:
	cd backend && php bin/console doctrine:migrations:migrate --no-interaction

cc:
	cd backend && php bin/console cache:clear

test:
	cd backend && php bin/phpunit
