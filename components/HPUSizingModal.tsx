import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface HPUSizingModalProps {
    onClose: () => void;
}

const InputField: React.FC<{ label: string; code: string; unit?: string; value: number | string; onChange?: (value: number) => void; isEditable: boolean }> = ({ label, code, unit, value, onChange, isEditable }) => (
    <div className="grid grid-cols-3 items-center gap-4 py-2 border-b dark:border-gray-700">
        <label htmlFor={isEditable ? code : undefined} className="font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <span className="text-sm text-gray-500">{code}</span>
        <div className="flex items-center">
            {isEditable && onChange ? (
                <input
                    type="number"
                    id={code}
                    value={value}
                    onChange={e => onChange(parseFloat(e.target.value) || 0)}
                    className="w-full p-1 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-blue-500 outline-none"
                />
            ) : (
                <span className="w-full p-1 text-gray-900 dark:text-gray-100">{value}</span>
            )}
            {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
        </div>
    </div>
);


const OutputField: React.FC<{ label: string; value: string; unit: string; isHighlighted?: boolean }> = ({ label, value, unit, isHighlighted }) => (
     <div className={`grid grid-cols-3 items-center gap-4 py-2 ${isHighlighted ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={isHighlighted ? '' : 'text-gray-500'}>=</span>
        <div className="flex justify-between items-center">
            <span>{value}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
        </div>
    </div>
);


export const HPUSizingModal: React.FC<HPUSizingModalProps> = ({ onClose }) => {
    // Editable inputs from user
    const [rpm, setRpm] = useState(2804);
    const [deltaP, setDeltaP] = useState(153); // bar

    // Constants based on the Excel sheet and standard engineering data
    const MOTOR_MODEL = "A2FM 23";
    const MOTOR_DISPLACEMENT = 23; // cm³/rev, as specified by user.
    const NUM_PUMPS = 1;
    const TOTAL_PRESSURE_DROP = 10; // bar
    const NUM_HPU = 1;
    const EFFICIENCY_FACTOR = 0.8075;
    const VOLUMETRIC_EFFICIENCY_CONST = 0.970;
    const LEAKAGE = 1; // L/min
    
    // Calculated Outputs
    const [hydraulicFlow, setHydraulicFlow] = useState(0);
    const [totalFlow, setTotalFlow] = useState(0);
    const [powerKw, setPowerKw] = useState(0);
    const [powerPerHPU, setPowerPerHPU] = useState(0);

    useEffect(() => {
        // Formula: Flow hydraulic = RPM * V / (1000 * 0.970)
        const calculatedHydraulicFlow = (rpm * MOTOR_DISPLACEMENT) / (1000 * VOLUMETRIC_EFFICIENCY_CONST);
        setHydraulicFlow(calculatedHydraulicFlow);

        // Formula: Total Flow = (Ant.P * Flow hyd.) + 1
        const calculatedTotalFlow = (NUM_PUMPS * calculatedHydraulicFlow) + LEAKAGE;
        setTotalFlow(calculatedTotalFlow);

        // Formula: Effekt = (ΔP + Trykkfall total) * Flow hyd. / (600 * Eff.virk)
        // Note: The power calculation correctly uses HYDRAULIC flow, not total flow.
        const totalPressure = deltaP + TOTAL_PRESSURE_DROP;
        const calculatedPowerKw = (totalPressure * calculatedHydraulicFlow) / (600 * EFFICIENCY_FACTOR);
        setPowerKw(calculatedPowerKw);

        // Formula: Effekt pr HPU = Effekt / Ant.HPU
        const calculatedPowerPerHPU = NUM_HPU > 0 ? calculatedPowerKw / NUM_HPU : 0;
        setPowerPerHPU(calculatedPowerPerHPU);

    }, [rpm, deltaP]);


    return (
        <Modal isOpen={true} onClose={onClose} title="HPU Sizing Calculator">
            <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Inputs</h3>
                    <InputField label="RPM" code="RPM" unit="rpm" value={rpm} onChange={setRpm} isEditable={true} />
                    <InputField label="Motor Delta P" code="ΔP" unit="bar" value={deltaP} onChange={setDeltaP} isEditable={true} />
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">System Parameters</h3>
                    <InputField label="Motor Type" code="V" unit="cm³/rev" value={`${MOTOR_MODEL} (${MOTOR_DISPLACEMENT})`} isEditable={false} />
                    <InputField label="Number of Pumps" code="Ant.P" value={NUM_PUMPS} isEditable={false} />
                    <InputField label="Total Pressure Drop" code="tap" unit="bar" value={TOTAL_PRESSURE_DROP} isEditable={false} />
                    <InputField label="Number of HPUs" code="HPU" value={NUM_HPU} isEditable={false} />
                    <InputField label="Efficiency Factor" code="Eff.virk" value={EFFICIENCY_FACTOR} isEditable={false} />
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-gray-900/50">
                     <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Results</h3>
                     <OutputField label="Hydraulic Flow" value={hydraulicFlow.toFixed(2)} unit="L/min" />
                     <OutputField label="Total Flow (with leakage)" value={totalFlow.toFixed(2)} unit="L/min" />
                     <OutputField label="Total Power Required" value={powerKw.toFixed(2)} unit="kW" isHighlighted />
                     <OutputField label="Power per HPU" value={powerPerHPU.toFixed(2)} unit="kW" isHighlighted />
                </div>
                
                 <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Close</button>
                </div>
            </div>
        </Modal>
    );
};