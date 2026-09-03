#!/bin/bash
php artisan queue:work --tries=1 --timeout=0
