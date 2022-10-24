src/schema.json: schema.yaml
	pipx run --spec linkml gen-linkml $< --format json > $@
