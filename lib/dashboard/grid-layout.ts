import { DashboardWidget, WidgetSize } from './types';

export interface GridConfig {
  cols: number;
  rowHeight: number;
  gap: number;
}

export interface WidgetPosition {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Convert widget size to grid columns
export function sizeToColumns(size: WidgetSize, gridCols: number): number {
  if (gridCols === 1) return 1; // Mobile: all widgets full width
  
  switch (size) {
    case 'small':
      return 1;
    case 'medium':
      return Math.min(2, gridCols);
    case 'large':
      return gridCols;
    default:
      return 1;
  }
}

// Calculate auto-layout for widgets without saved positions
export function calculateAutoLayout(
  widgets: DashboardWidget[],
  gridCols: number
): WidgetPosition[] {
  const positions: WidgetPosition[] = [];
  const grid: boolean[][] = [];

  // Initialize grid with false (empty cells)
  const maxRows = 100; // Arbitrary large number
  for (let y = 0; y < maxRows; y++) {
    grid[y] = new Array(gridCols).fill(false);
  }

  // Sort widgets: prioritize those with saved positions, then by preference position
  const sortedWidgets = [...widgets].sort((a, b) => {
    // Widgets with saved grid positions first
    if (a.preference?.grid_x !== undefined && b.preference?.grid_x === undefined) return -1;
    if (a.preference?.grid_x === undefined && b.preference?.grid_x !== undefined) return 1;
    
    // Then by grid_y
    if (a.preference?.grid_y !== undefined && b.preference?.grid_y !== undefined) {
      if (a.preference.grid_y !== b.preference.grid_y) {
        return a.preference.grid_y - b.preference.grid_y;
      }
      // Same row, sort by x
      return (a.preference.grid_x || 0) - (b.preference.grid_x || 0);
    }
    
    // Finally by position
    const posA = a.preference?.position ?? 999;
    const posB = b.preference?.position ?? 999;
    return posA - posB;
  });

  for (const widget of sortedWidgets) {
    const w = widget.preference?.grid_w || sizeToColumns(widget.preference?.size || widget.defaultSize, gridCols);
    const h = widget.preference?.grid_h || 1;

    let x = widget.preference?.grid_x;
    let y = widget.preference?.grid_y;

    // If position is saved and valid, use it
    if (x !== undefined && y !== undefined && x >= 0 && x + w <= gridCols && y >= 0) {
      // Check if space is available
      const canPlace = canPlaceWidget(grid, x, y, w, h);
      if (canPlace) {
        placeWidget(grid, x, y, w, h);
        positions.push({ id: widget.id, x, y, w, h });
        continue;
      }
    }

    // Find first available position
    let placed = false;
    for (let row = 0; row < maxRows && !placed; row++) {
      for (let col = 0; col <= gridCols - w && !placed; col++) {
        if (canPlaceWidget(grid, col, row, w, h)) {
          placeWidget(grid, col, row, w, h);
          positions.push({ id: widget.id, x: col, y: row, w, h });
          placed = true;
        }
      }
    }

    if (!placed) {
      // Fallback: place at bottom
      const bottomRow = findBottomRow(grid);
      placeWidget(grid, 0, bottomRow, w, h);
      positions.push({ id: widget.id, x: 0, y: bottomRow, w, h });
    }
  }

  return positions;
}

function canPlaceWidget(
  grid: boolean[][],
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (y + h > grid.length || x + w > grid[0].length) return false;

  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (grid[row]?.[col]) return false;
    }
  }
  return true;
}

function placeWidget(
  grid: boolean[][],
  x: number,
  y: number,
  w: number,
  h: number
): void {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (grid[row]) {
        grid[row][col] = true;
      }
    }
  }
}

function findBottomRow(grid: boolean[][]): number {
  for (let y = grid.length - 1; y >= 0; y--) {
    if (grid[y].some(cell => cell)) {
      return y + 1;
    }
  }
  return 0;
}

// Calculate drop position from mouse coordinates
export function calculateDropPosition(
  event: { delta: { x: number; y: number } },
  originalPosition: WidgetPosition,
  containerRect: DOMRect,
  gridConfig: GridConfig
): { x: number; y: number } {
  const cellWidth = (containerRect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols;
  const cellHeight = gridConfig.rowHeight;

  const deltaX = event.delta.x;
  const deltaY = event.delta.y;

  const colDelta = Math.round(deltaX / (cellWidth + gridConfig.gap));
  const rowDelta = Math.round(deltaY / (cellHeight + gridConfig.gap));

  const newX = Math.max(0, Math.min(originalPosition.x + colDelta, gridConfig.cols - originalPosition.w));
  const newY = Math.max(0, originalPosition.y + rowDelta);

  return { x: newX, y: newY };
}
