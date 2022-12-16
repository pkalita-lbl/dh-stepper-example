import React, { useState, useRef } from 'react'
import produce from 'immer'
import * as XLSX from 'xlsx'

import DataHarmonizer from './components/DataHarmonizer'
import Stepper from './components/Stepper'

import schema from './schema.json'

const EXPORT_FILENAME = 'nmdc_sample_export.xlsx'

// controls which field is used to merge data from different DH views
const SCHEMA_ID = 'source_mat_id'

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

function getSlot(slotName) {
  return schema.slots[slotName]
}

function getSlotGroupRank(slotName) {
  const slot = getSlot(slotName)
  if (!slot || !slot.slot_group) {
    return 9999
  }
  return getSlotRank(slot.slot_group)
}

function getSlotRank(slotName) {
  const slot = getSlot(slotName)
  if (!slot) {
    return 9999
  }
  return slot.rank
}

function getOrderedAttributes(template) {
  return Object.keys(schema.classes[template].attributes)
    .sort((a, b) => {
      const aSlotGroupRank = getSlotGroupRank(a)
      const bSlotGroupRank = getSlotGroupRank(b)
      if (aSlotGroupRank !== bSlotGroupRank) {
        return aSlotGroupRank - bSlotGroupRank
      }
      const aSlotRank = getSlotRank(a)
      const bSlotRank = getSlotRank(b)
      return aSlotRank - bSlotRank
    })
}

function getHeaderRow(template) {
  const orderedAttrNames = getOrderedAttributes(template)
  const attrs = schema.classes[template].attributes
  const header = {}
  for (const attrName of orderedAttrNames) {
    header[attrName] = attrs[attrName].title || attrs[attrName].name
  }
  return header
}

function flattenArrayValues(table) {
  return produce(table, draft => {
    for (const row of draft) {
      for (const [key, value] of Object.entries(row)) {
        if (Array.isArray(value)) {
          row[key] = value.join('; ')
        }
      }
    }
  })
}

function unflattenArrayValues(table, template) {
  return produce(table, draft => {
    for (const row of draft) {
      for (const [key, value] of Object.entries(row)) {
        if (schema.classes[template].attributes[key].multivalued) {
          row[key] = value.split(';').map(v => v.trim())
        }
      }
    }
  })
}

function rowIsVisibleForTemplate(row, template) {
  if (template === ENVIRONMENT_TEMPLATE) {
    return true
  }
  const row_types = row[TYPE_FIELD]
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
  const fileInputRef = useRef(null)
  const [active, setActive] = useState(0)
  const [data, setData] = useState({})
  const [invalidCells, setInvalidCells] = useState({})

  const activeTemplate = TEMPLATES[active]

  function handleStepChange(nextStep) {
    doValidate()
    handleSync()
    // need to populate common columns for upcoming view
    const nextTemplate = TEMPLATES[nextStep]
    setData(produce(data => {
      for (const row of data[ENVIRONMENT_TEMPLATE]) {
        if (rowIsVisibleForTemplate(row, nextTemplate)) {
          const rowId = row[SCHEMA_ID]
          if (!data[nextTemplate]) {
            data[nextTemplate] = []
          }
          const existing = data[nextTemplate].find(r => r[SCHEMA_ID] === rowId)
          if (!existing) {
            const newRow = {}
            for (const col of COMMON_COLUMNS) {
              newRow[col] = row[col]
            }
            data[nextTemplate].push(newRow)
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
      data[activeTemplate] = current
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

  function handleExport() {
    // TODO data may not be fully sync'd at this point
    const workbook = XLSX.utils.book_new()
    for (const template of TEMPLATES) {
      const worksheet = XLSX.utils.json_to_sheet([
        getHeaderRow(template),
        ...flattenArrayValues(data[template])
      ], {
        skipHeader: true
      })
      XLSX.utils.book_append_sheet(workbook, worksheet, template)
    }
    XLSX.writeFile(workbook, EXPORT_FILENAME, { compression: true })
  }

  function handleImport(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const workbook = XLSX.read(e.target.result);
      const imported = {}
      for (const [name, worksheet] of Object.entries(workbook.Sheets)) {
        imported[name] = unflattenArrayValues(
          XLSX.utils.sheet_to_json(worksheet, { 
            header: getOrderedAttributes(name),
            range: 1
          }), name)
      }
      setData(imported)
    };
    reader.readAsArrayBuffer(file);
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

  const idCol = dhRef.current?.getFields().findIndex(f => f.name === SCHEMA_ID)
  
  return (
    <div className='p-4'>
      <div className="row">
        <div className="col-7">
          <Stepper steps={TEMPLATES} active={active} onChange={handleStepChange} />
          
          <button className="btn btn-outline-secondary mb-2" onClick={handleAddTestData}>Test Data</button>
          <button className='btn btn-warning mb-2 ml-2' onClick={handleValidate}>Validate</button>
          <button className='btn btn-warning mb-2 ml-2' onClick={handleSync}>Sync</button>
          <button className='btn btn-info mb-2 ml-2' onClick={handleExport}>Export</button>
          <input ref={fileInputRef} type="file" style={{position: 'fixed', top: -1000}} onChange={evt => handleImport(evt.target.files[0])}/>
          <button className='btn btn-info mb-2 ml-2' onClick={() => fileInputRef.current.click()}>Import</button>

          <DataHarmonizer 
            schema={schema} 
            template={activeTemplate} 
            allowNewRows={activeTemplate === ENVIRONMENT_TEMPLATE}
            data={data[activeTemplate] || []} 
            invalidCells={invalidCells[activeTemplate]}
            readOnlyCols={activeTemplate === ENVIRONMENT_TEMPLATE ? [] : [idCol]}
            dhRef={dhRef} 
          />
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
