import React, { useEffect, useRef } from "react";
import PropTypes from 'prop-types'
import { DataHarmonizer as DH } from 'data-harmonizer'

import style from './DataHarmonizer.module.scss'

function DataHarmonizer({ schema, template, data, dhRef, invalidCells, allowNewRows = true, readOnlyCols = [] }) {
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
    if (allowNewRows) {
      dhRef.current.hot.updateSettings({maxRows: data.length + 100})
    } else {
      dhRef.current.hot.updateSettings({maxRows: data.length})
    }
  }, [data, allowNewRows, dhRef])

  useEffect(() => {
    if (!dhRef.current || !invalidCells) {
      return
    }
    dhRef.current.invalid_cells = invalidCells
    dhRef.current.hot.render()
  }, [invalidCells, dhRef])

  useEffect(() => {
    const hot = dhRef.current.hot
    const rowCount = hot.countRows()
    for (let col of readOnlyCols) {
      for (let row = 0; row < rowCount; row += 1) {
        hot.setCellMeta(row, col, 'readOnly', true)
      }
    }
    hot.render()
  }, [readOnlyCols, dhRef])

  return <div ref={gridRef} className={style.dhRoot}></div>
}

DataHarmonizer.propTypes = {
  allowNewRows: PropTypes.bool,
  dhRef: PropTypes.shape({
    current: PropTypes.any
  }),
  data: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
  schema: PropTypes.object.isRequired,
  template: PropTypes.string.isRequired,
  invalidCells: PropTypes.object,
  readOnlyCols: PropTypes.arrayOf(PropTypes.number)
}

export default DataHarmonizer
