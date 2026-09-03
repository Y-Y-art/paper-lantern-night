import { Game } from './game';
import './style.css';

const canvas = document.getElementById('c') as HTMLCanvasElement;
new Game(canvas);
