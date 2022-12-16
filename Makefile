src/schema.json: schema.yaml
	pipx run --spec linkml gen-linkml $< --format json > $@

jsonschema/schema.json: schema.yaml
	mkdir -p jsonschema
	pipx run --spec linkml gen-json-schema --top-class Submission $< > $@
