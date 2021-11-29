import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Score } from './score';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    IconLookup,
    IconDefinition,
    findIconDefinition
} from '@fortawesome/fontawesome-svg-core'
import { areEqual } from '../utils';

interface IControlMenu {
    clickHandler: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void,
    btnClick: React.Dispatch<React.SetStateAction<boolean>>,
}

const ControllMenu = ({ clickHandler, btnClick }: React.PropsWithChildren<IControlMenu>) => {
    const chevronLookLeft: IconLookup = { prefix: 'fas', iconName: 'chevron-left' };
    const chevronLeft: IconDefinition = findIconDefinition(chevronLookLeft);

    return <div className="flex flex-row justify-between text-sm content-center pt-2">
        <Link to={"/select"} onClick={clickHandler} className="text-yellow-300  h-8 w-4/8 p-2 ">
            <FontAwesomeIcon className="yellow-300 text-xs" icon={chevronLeft} /> Back
        </Link>
        <Score />
        <button onClick={() => { btnClick(true) }} className="text-sm text-yellow-300 mr-2" >Top score </button>
    </div>

}

export default memo(ControllMenu, areEqual)