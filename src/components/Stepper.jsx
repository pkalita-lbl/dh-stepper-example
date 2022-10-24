import React from "react";
import PropTypes from 'prop-types'

import style from './Stepper.module.scss'

function Stepper({ active, onChange, steps }) {
  return (
    <div className={`mb-2 ${style.stepper}`} role="group">
      { steps.map((step, idx) => (
        <button
          type="button" 
          className={`${style.step} ${idx === active ? style.active : ''}`}
          onClick={() => onChange(idx)}
          key={step}
        >
          <div className={style.number}>{idx + 1}</div>
          <div>{step}</div>
        </button>
      ))}
    </div>
  )
}

Stepper.propTypes = {
  active: PropTypes.number,
  onChange: PropTypes.func,
  steps: PropTypes.arrayOf(PropTypes.string)
}

export default Stepper
