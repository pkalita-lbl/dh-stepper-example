import React from "react";
import PropTypes from 'prop-types'

function Stepper({ active, onChange, steps }) {
  return (
    <div className="btn-group mb-2" role="group">
      { steps.map((step, idx) => (
        <button
          type="button" 
          className={`btn btn-secondary ${idx === active ? 'active' : ''}`}
          onClick={() => onChange(idx)}
          key={step}
        >
          {step}
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
