import { vscode } from './vscodeApi';

type LogLevel = 'info' | 'warn' | 'error';

const logBody = document.getElementById('log-body');
const logPanel = document.getElementById('log-panel');
const logToggle = document.getElementById('log-toggle');

let logVisible = false;

function updateLogVisibility(): void {
	if (!logPanel || !logToggle) {
		return;
	}
	logPanel.classList.toggle('collapsed', !logVisible);
	logToggle.textContent = logVisible ? 'Output ▼' : 'Output ▲';
	logToggle.setAttribute('aria-expanded', String(logVisible));
}

export function toggleLogPanel(): void {
	logVisible = !logVisible;
	updateLogVisibility();
}

export function showLogPanel(): void {
	if (!logPanel) {
		return;
	}
	if (!logVisible) {
		logVisible = true;
		updateLogVisibility();
	}
}

export function log(level: LogLevel, message: string): void {
	if (logBody) {
		const time = new Date().toLocaleTimeString();
		const line = document.createElement('div');
		line.className = `log-line log-${level}`;
		line.textContent = `[${time}] [${level.toUpperCase()}] ${message}`;
		logBody.appendChild(line);
		logBody.scrollTop = logBody.scrollHeight;
	}
	vscode.postMessage({ type: 'log', level, message });
}

export function clearLog(): void {
	if (logBody) {
		logBody.innerHTML = '';
	}
}

logToggle?.addEventListener('click', toggleLogPanel);
document.getElementById('log-clear')?.addEventListener('click', () => {
	clearLog();
	log('info', 'Log cleared.');
});

updateLogVisibility();
