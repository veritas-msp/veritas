import React from 'react';
import styles from './Form.module.css';
const SegmentedControl = ({
  name,
  options,
  selectedValue,
  onChange
}) => {
  return <div className={styles.segmentedControl}>
      {options.map(option => <button key={option.value} type="button" name={name} className={selectedValue === option.value ? styles.active : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>)}
    </div>;
};
export default SegmentedControl;
