ALTER TABLE item_rates
DROP FOREIGN KEY item_rates_ibfk_5;

ALTER TABLE item_rates
ADD CONSTRAINT fk_item_rates_item_definition
FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id) ON DELETE CASCADE;
