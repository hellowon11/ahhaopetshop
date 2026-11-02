-- Daycare pricing: daily from RM70, longer stay from RM50 per day
update public.day_care_options
set price = 70, display_price = 'RM 70.00', description = 'Same-day day care'
where type = 'daily';

update public.day_care_options
set price = 50, display_price = 'RM 50.00', description = 'Per day for multi-day stay'
where type = 'longTerm';
