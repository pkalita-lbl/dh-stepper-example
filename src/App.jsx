import React, { useState, useRef, useMemo } from 'react'
import produce from 'immer'
import DataHarmonizer from './components/DataHarmonizer'
import Stepper from './components/Stepper'

import schema from './schema.json'

// controls which field is used to merge data from different DH views
const SCHEMA_ID = 'source_mat_id'
const INTERNAL_ID = '_id'

// used in determining which rows are shown in each view
const TYPE_FIELD = 'analysis_type'

const COMMON_COLUMN_MIXIN = 'dh_mutliview_common_columns'
const COMMON_COLUMNS = schema.classes[COMMON_COLUMN_MIXIN].slots

const BIOSAMPLE_CLASSES = [
  'air', 
  'biofilm', 
  'bioscales',
  'built_env', 
  'host-associated', 
  'plant-associated', 
  'sediment', 
  'soil', 
  'wastewater_sludge',
  'water',
]

const EMSL = 'emsl_mixin'
const JGI_MG = 'jgi_mg_mixin'
const JGT_MT = 'jgi_mt_mixin'

// in the real submission portal, this list needs to be the output
// of the omics types checkboxes
const TEMPLATES = [
  BIOSAMPLE_CLASSES[8],
  EMSL,
  JGI_MG,
  JGT_MT,
]
const ENVIRONMENT_TEMPLATE = TEMPLATES[0]

function rowIsVisibleForTemplate(row, template) {
  if (template === ENVIRONMENT_TEMPLATE) {
    return true
  }
  const row_types = row[ENVIRONMENT_TEMPLATE][TYPE_FIELD]
  if (!row_types) {
    return false
  }
  if (template === EMSL) {
    return row_types.includes('metaproteomics') ||
      row_types.includes('metabolomics') ||
      row_types.includes('natural organic matter')
  } else if (template === JGI_MG) {
    return row_types.includes('metagenomics')
  } else if (template === JGT_MT) {
    return row_types.includes('metatranscriptomics')
  }
  return false
}

function App() {
  const dhRef = useRef(null)
  const [active, setActive] = useState(0)
  const [data, setData] = useState([])
  const [invalidCells, setInvalidCells] = useState({})

  const activeTemplate = TEMPLATES[active]

  function handleStepChange(nextStep) {
    doValidate()
    handleSync()
    // need to populate common columns for upcoming view
    const nextTemplate = TEMPLATES[nextStep]
    setData(produce(data => {
      for (const row of data) {
        if (row[nextTemplate] == undefined && rowIsVisibleForTemplate(row, nextTemplate)) {
          row[nextTemplate] = {}
          for (const col of COMMON_COLUMNS) {
            row[nextTemplate][col] = row[ENVIRONMENT_TEMPLATE][col]
          }
        }
      }
    }))
    setActive(nextStep)
  }

  function handleSync() {
    const current = dhRef.current.getDataObjects(false)
    // TODO: open bug in DH re: delimiter mismatch
    for (const row of current) {
      for (const [key, value] of Object.entries(row)) {
        if (Array.isArray(value) && value[0].includes(';')) {
          row[key] = value[0].split(';')
        }
      }
    }
    setData(produce(data => {
      for (const row of current) {
        const rowId = row[SCHEMA_ID]
        const mergeRow = data.find(d => d[INTERNAL_ID] === rowId)
        if (mergeRow == undefined && activeTemplate === ENVIRONMENT_TEMPLATE) {
          data.push({
            [INTERNAL_ID]: rowId,
            [activeTemplate]: row
          })
        } else {
          mergeRow[activeTemplate] = row
        }
      }
    }))
  }

  function handleAddTestData() {
    dhRef.current.loadDataObjects([
      {
        samp_name: 'v',
        source_mat_id: 'UUID:1',
        analysis_type: ['metabolomics'],
        env_broad_scale: 'ENVO:01'
      },
      {
        samp_name: 'w',
        source_mat_id: 'UUID:2',
        analysis_type: ['metagenomics'],
        env_broad_scale: 'ENVO:01'
      },
      {
        samp_name: 'x',
        source_mat_id: 'UUID:3',
        analysis_type: ['metagenomics', 'metaproteomics'],
        env_broad_scale: 'ENVO:01'
      },
      {
        samp_name: 'y',
        source_mat_id: 'UUID:4',
        analysis_type: ['metatranscriptomics'],
        env_broad_scale: 'ENVO:02'
      },
      {
        samp_name: 'z',
        source_mat_id: 'UUID:5',
        analysis_type: ['natural organic matter'],
        env_broad_scale: 'ENVO:02'
      },
    ])
  }

  function handleValidate() {
    doValidate()
  }

  function doValidate() {
    dhRef.current.validate()
    setInvalidCells(prev => {
      return {
        ...prev,
        [activeTemplate]: dhRef.current.invalid_cells
      }
    })
  }


  const filteredData = useMemo(() => {
    return data
      .map(row => row[activeTemplate])
      .filter(row => row !== undefined)
  }, [data, activeTemplate])


  const idCol = dhRef.current?.getFields().findIndex(f => f.name === SCHEMA_ID)
  
  return (
    <div className='p-4'>
      <div className="row">
        <div className="col-7">
          <Stepper steps={TEMPLATES} active={active} onChange={handleStepChange} />
          <button className='btn btn-warning mb-2' onClick={handleValidate}>Validate</button>
          <button className='btn btn-warning mb-2 ml-2' onClick={handleSync}>Sync</button>
          <DataHarmonizer 
            schema={schema} 
            template={activeTemplate} 
            data={filteredData} 
            invalidCells={invalidCells[activeTemplate]}
            readOnlyCols={activeTemplate === TEMPLATES[0] ? [] : [idCol]}
            dhRef={dhRef} 
          />
          <button className="btn btn-outline-secondary mt-2" onClick={handleAddTestData}>Test Data</button>
        </div>
        <div className="col-5 border-left">
          <div className='alert alert-secondary small mt-2'>
            <h5 className='alert-heading'>Data</h5>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
          <div className='alert alert-warning small'>
            <h5 className='alert-heading'>Validation</h5>
            <pre>{JSON.stringify(invalidCells, null, 2)}</pre>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
