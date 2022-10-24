import React, { useEffect, useRef } from "react";
import PropTypes from 'prop-types'
import { DataHarmonizer as DH } from 'data-harmonizer'

import style from './DataHarmonizer.module.scss'

function DataHarmonizer({ schema, template }) {
  const gridRef = useRef(null)
  const dhRef = useRef(null)

  useEffect(() => {
    if (!dhRef.current) {
      dhRef.current = new DH(gridRef.current);
    }
    dhRef.current.useSchema(schema, [], template)
  }, [schema, template])

  return <div ref={gridRef} className={style.dhRoot}></div>
}

DataHarmonizer.propTypes = {
  schema: PropTypes.object.isRequired,
  template: PropTypes.string.isRequired,
}

export default DataHarmonizer
