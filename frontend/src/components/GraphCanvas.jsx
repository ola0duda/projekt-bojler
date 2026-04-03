function truncateLabel(value, maxLength = 24) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function buildEdgePath(source, target, layoutConfig) {
  const startX = source.x + layoutConfig.nodeWidth;
  const startY = source.y + layoutConfig.nodeHeight / 2;
  const endX = target.x;
  const endY = target.y + layoutConfig.nodeHeight / 2;
  const controlOffset = Math.max(48, Math.abs(endX - startX) / 2);

  return [
    `M ${startX} ${startY}`,
    `C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`,
  ].join(" ");
}

function getModeCaption(mode) {
  if (mode === "dependency") {
    return "Uklad wynika z zaleznosci pomiedzy zadaniami.";
  }

  if (mode === "es") {
    return "Widok ASAP ustawia zadania wedlug najwczesniejszych startow.";
  }

  return "Widok ALAP ustawia zadania wedlug najpozniejszych startow.";
}

export default function GraphCanvas({
  tasks,
  edges,
  layout,
  layoutConfig,
  mode,
  projectDuration,
}) {
  if (!layout || !layoutConfig || tasks.length === 0) {
    return (
      <div className="graph-empty">
        Dodaj zadania i zaleznosci, aby zobaczyc wykres CPM.
      </div>
    );
  }

  const nodesById = new Map(layout.nodes.map((node) => [node.id, node]));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const ticks = Array.from({ length: Math.max(projectDuration, 1) + 1 }, (_, index) => index);

  return (
    <div className="graph-wrapper">
      <div className="graph-caption">{getModeCaption(mode)}</div>
      <div className="graph-scroll">
        <svg
          className="graph-canvas"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Wizualizacja sieci CPM"
        >
          <defs>
            <marker
              id="edgeArrow"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#7b8ba5" />
            </marker>
            <marker
              id="edgeArrowCritical"
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef5f4c" />
            </marker>
          </defs>

          {mode !== "dependency" &&
            ticks.map((tick) => {
              const x = layoutConfig.margin + tick * layoutConfig.timeStep;

              return (
                <g key={`tick-${tick}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={32}
                    y2={layout.height - 32}
                    className="graph-grid-line"
                  />
                  <text x={x + 4} y={28} className="graph-grid-label">
                    {tick}
                  </text>
                </g>
              );
            })}

          {edges.map((edge) => {
            const source = nodesById.get(edge.from);
            const target = nodesById.get(edge.to);

            if (!source || !target) {
              return null;
            }

            return (
              <path
                key={edge.id}
                d={buildEdgePath(source, target, layoutConfig)}
                className={edge.isCritical ? "graph-edge critical" : "graph-edge"}
                markerEnd={edge.isCritical ? "url(#edgeArrowCritical)" : "url(#edgeArrow)"}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const task = tasksById.get(node.id);

            if (!task) {
              return null;
            }

            return (
              <g key={task.id} transform={`translate(${node.x}, ${node.y})`}>
                <rect
                  width={layoutConfig.nodeWidth}
                  height={layoutConfig.nodeHeight}
                  rx="24"
                  className={task.isCritical ? "graph-node critical" : "graph-node"}
                />
                <text x="16" y="24" className="graph-node-id">
                  {task.id}
                </text>
                <text x="16" y="48" className="graph-node-title">
                  {truncateLabel(task.name)}
                </text>
                <text x="16" y="70" className="graph-node-meta">
                  Czas {task.duration} | Luz {task.slack}
                </text>
                <text x="16" y="90" className="graph-node-meta">
                  ES {task.es}  EF {task.ef}
                </text>
                <text x="16" y="108" className="graph-node-meta">
                  LS {task.ls}  LF {task.lf}
                </text>
                {task.isCritical && (
                  <text x={layoutConfig.nodeWidth - 84} y="24" className="graph-node-badge">
                    krytyczne
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
