# LinenTrack CRM v3
FROM php:8.2-cli

FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    curl zip unzip git libonig-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_mysql mbstring \
    && curl -sS https://getcomposer.org/installer | php \
    && mv composer.phar /usr/local/bin/composer

WORKDIR /app

COPY backend/ .

RUN composer install --no-dev --optimize-autoloader --no-scripts

RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache && chmod -R 777 storage bootstrap/cache

EXPOSE 8000

CMD php /app/artisan migrate --seed --force && php /app/artisan serve --host=0.0.0.0 --port=$PORT
