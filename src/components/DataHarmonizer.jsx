import React, { useEffect, useRef } from "react";
import PropTypes from 'prop-types'
import { DataHarmonizer as DH } from 'data-harmonizer'

import style from './DataHarmonizer.module.scss'

function DataHarmonizer({ schema, template, data, dhRef, invalidCells }) {
  const gridRef = useRef(null)

  useEffect(() => {
    if (!dhRef.current) {
      dhRef.current = new DH(gridRef.current);
    }
    dhRef.current.useSchema(schema, [], template)
  }, [schema, template, dhRef])

  useEffect(() => {
    if (!dhRef.current) {
      return
    }
    dhRef.current.loadDataObjects(data)
  }, [data, dhRef])

  useEffect(() => {
    if (!dhRef.current || !invalidCells) {
      return
    }
    dhRef.current.invalid_cells = invalidCells
    dhRef.current.hot.render()
  }, [invalidCells, dhRef])

  return <div ref={gridRef} className={style.dhRoot}></div>
}

DataHarmonizer.propTypes = {
  dhRef: PropTypes.shape({
    current: PropTypes.any
  }),
  data: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
  schema: PropTypes.object.isRequired,
  template: PropTypes.string.isRequired,
  invalidCells: PropTypes.object,
}

export default DataHarmonizer
