const LAYOUT_CONFIG = {
  margin: 72,
  nodeWidth: 196,
  nodeHeight: 112,
  columnStep: 248,
  rowStep: 144,
  timeStep: 148,
};

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

function normalizeTasks(rawTasks) {
  if (!Array.isArray(rawTasks)) {
    throw new ValidationError("Pole 'tasks' musi byc tablica.");
  }

  const usedIds = new Set();

  return rawTasks.map((rawTask, index) => {
    if (!rawTask || typeof rawTask !== "object") {
      throw new ValidationError(`Zadanie na pozycji ${index + 1} ma nieprawidlowy format.`);
    }

    const fallbackId = `T${index + 1}`;
    const id = String(rawTask.id ?? fallbackId).trim() || fallbackId;
    const name = String(rawTask.name ?? "").trim();
    const duration = Number(rawTask.duration);
    const dependenciesSource = Array.isArray(rawTask.dependencies)
      ? rawTask.dependencies
      : [];

    const dependencies = [
      ...new Set(
        dependenciesSource
          .map((dependencyId) => String(dependencyId).trim())
          .filter(Boolean)
      ),
    ];

    if (!name) {
      throw new ValidationError(`Zadanie ${id} musi miec nazwe.`);
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new ValidationError(`Zadanie ${id} musi miec dodatni czas trwania.`);
    }

    if (usedIds.has(id)) {
      throw new ValidationError(`Id zadania ${id} wystepuje wiecej niz raz.`);
    }

    if (dependencies.includes(id)) {
      throw new ValidationError(`Zadanie ${id} nie moze zalezec od samego siebie.`);
    }

    usedIds.add(id);

    return {
      id,
      name,
      duration,
      dependencies,
      orderIndex: index,
      successors: [],
    };
  });
}

function buildTaskMap(tasks) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));

  tasks.forEach((task) => {
    task.dependencies.forEach((dependencyId) => {
      const dependency = taskMap.get(dependencyId);

      if (!dependency) {
        throw new ValidationError(
          `Zadanie ${task.id} odwoluje sie do nieistniejacego poprzednika ${dependencyId}.`
        );
      }

      dependency.successors.push(task.id);
    });
  });

  tasks.forEach((task) => {
    task.successors.sort();
  });

  return taskMap;
}

function topologicalSort(tasks, taskMap) {
  const indegree = new Map();

  tasks.forEach((task) => {
    indegree.set(task.id, task.dependencies.length);
  });

  const queue = tasks
    .filter((task) => task.dependencies.length === 0)
    .sort((left, right) => left.orderIndex - right.orderIndex);

  const order = [];

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current.id);

    current.successors.forEach((successorId) => {
      const nextIndegree = indegree.get(successorId) - 1;
      indegree.set(successorId, nextIndegree);

      if (nextIndegree === 0) {
        queue.push(taskMap.get(successorId));
        queue.sort((left, right) => left.orderIndex - right.orderIndex);
      }
    });
  }

  if (order.length !== tasks.length) {
    throw new ValidationError("Wykryto cykl zaleznosci. CPM wymaga grafu acyklicznego.");
  }

  return order;
}

function computeDepth(task, depthById) {
  if (task.dependencies.length === 0) {
    return 0;
  }

  return (
    Math.max(...task.dependencies.map((dependencyId) => depthById.get(dependencyId))) + 1
  );
}

function averageLane(task, laneById) {
  const lanes = task.dependencies
    .map((dependencyId) => laneById.get(dependencyId))
    .filter((lane) => Number.isInteger(lane));

  if (lanes.length === 0) {
    return task.orderIndex;
  }

  return lanes.reduce((sum, lane) => sum + lane, 0) / lanes.length;
}

function buildLaneMap(tasks) {
  const tasksByLayer = new Map();

  tasks.forEach((task) => {
    if (!tasksByLayer.has(task.layer)) {
      tasksByLayer.set(task.layer, []);
    }

    tasksByLayer.get(task.layer).push(task);
  });

  const laneById = new Map();

  [...tasksByLayer.keys()]
    .sort((left, right) => left - right)
    .forEach((layer) => {
      const layerTasks = tasksByLayer
        .get(layer)
        .slice()
        .sort((left, right) => {
          const laneDiff = averageLane(left, laneById) - averageLane(right, laneById);

          if (laneDiff !== 0) {
            return laneDiff;
          }

          if (left.es !== right.es) {
            return left.es - right.es;
          }

          return left.orderIndex - right.orderIndex;
        });

      layerTasks.forEach((task, index) => {
        laneById.set(task.id, index);
      });
    });

  return { laneById };
}

function buildLayout(tasks, projectDuration, laneById, mode) {
  const nodes = tasks.map((task) => {
    const lane = laneById.get(task.id) ?? 0;
    const y = LAYOUT_CONFIG.margin + lane * LAYOUT_CONFIG.rowStep;
    const x =
      mode === "dependency"
        ? LAYOUT_CONFIG.margin + task.layer * LAYOUT_CONFIG.columnStep
        : LAYOUT_CONFIG.margin + task[mode] * LAYOUT_CONFIG.timeStep;

    return {
      id: task.id,
      x,
      y,
    };
  });

  const width =
    nodes.reduce(
      (maxWidth, node) => Math.max(maxWidth, node.x + LAYOUT_CONFIG.nodeWidth),
      LAYOUT_CONFIG.margin + LAYOUT_CONFIG.nodeWidth
    ) + LAYOUT_CONFIG.margin;

  const timeWidth =
    LAYOUT_CONFIG.margin * 2 +
    LAYOUT_CONFIG.nodeWidth +
    Math.max(projectDuration, 1) * LAYOUT_CONFIG.timeStep;

  const height =
    nodes.reduce(
      (maxHeight, node) => Math.max(maxHeight, node.y + LAYOUT_CONFIG.nodeHeight),
      LAYOUT_CONFIG.margin + LAYOUT_CONFIG.nodeHeight
    ) + LAYOUT_CONFIG.margin;

  return {
    width: mode === "dependency" ? width : Math.max(width, timeWidth),
    height,
    nodes,
  };
}

function analyzeProject(rawTasks) {
  const normalizedTasks = normalizeTasks(rawTasks);

  if (normalizedTasks.length === 0) {
    return {
      tasks: [],
      edges: [],
      criticalTaskIds: [],
      projectDuration: 0,
      layouts: {
        dependency: {
          width: 640,
          height: 320,
          nodes: [],
        },
        es: {
          width: 640,
          height: 320,
          nodes: [],
        },
        ls: {
          width: 640,
          height: 320,
          nodes: [],
        },
      },
      layoutConfig: LAYOUT_CONFIG,
    };
  }

  const taskMap = buildTaskMap(normalizedTasks);
  const order = topologicalSort(normalizedTasks, taskMap);
  const metricsById = new Map();
  const depthById = new Map();

  order.forEach((taskId) => {
    const task = taskMap.get(taskId);
    const es =
      task.dependencies.length === 0
        ? 0
        : Math.max(...task.dependencies.map((dependencyId) => metricsById.get(dependencyId).ef));
    const ef = es + task.duration;

    metricsById.set(taskId, { es, ef });
    depthById.set(taskId, computeDepth(task, depthById));
  });

  const projectDuration = Math.max(...order.map((taskId) => metricsById.get(taskId).ef));

  [...order].reverse().forEach((taskId) => {
    const task = taskMap.get(taskId);
    const currentMetrics = metricsById.get(taskId);
    const lf =
      task.successors.length === 0
        ? projectDuration
        : Math.min(...task.successors.map((successorId) => metricsById.get(successorId).ls));
    const ls = lf - task.duration;
    const slack = ls - currentMetrics.es;

    metricsById.set(taskId, {
      ...currentMetrics,
      ls,
      lf,
      slack,
    });
  });

  const tasks = order.map((taskId) => {
    const task = taskMap.get(taskId);
    const metrics = metricsById.get(taskId);
    const layer = depthById.get(taskId);
    const isCritical = metrics.slack === 0;

    return {
      id: task.id,
      name: task.name,
      duration: task.duration,
      dependencies: task.dependencies,
      successors: task.successors,
      orderIndex: task.orderIndex,
      layer,
      ...metrics,
      isCritical,
    };
  });

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const criticalTaskIds = tasks.filter((task) => task.isCritical).map((task) => task.id);
  const criticalEdgeKeys = new Set();

  tasks.forEach((task) => {
    task.successors.forEach((successorId) => {
      const successor = tasksById.get(successorId);
      const isCriticalEdge =
        task.isCritical &&
        successor.isCritical &&
        task.ef === successor.es;

      if (isCriticalEdge) {
        criticalEdgeKeys.add(`${task.id}->${successorId}`);
      }
    });
  });

  const edges = tasks.flatMap((task) =>
    task.successors.map((successorId) => ({
      id: `${task.id}->${successorId}`,
      from: task.id,
      to: successorId,
      isCritical: criticalEdgeKeys.has(`${task.id}->${successorId}`),
    }))
  );

  const { laneById } = buildLaneMap(tasks);

  return {
    tasks: tasks.map(({ orderIndex, ...task }) => task),
    edges,
    criticalTaskIds,
    projectDuration,
    layouts: {
      dependency: buildLayout(tasks, projectDuration, laneById, "dependency"),
      es: buildLayout(tasks, projectDuration, laneById, "es"),
      ls: buildLayout(tasks, projectDuration, laneById, "ls"),
    },
    layoutConfig: LAYOUT_CONFIG,
  };
}

module.exports = {
  LAYOUT_CONFIG,
  ValidationError,
  analyzeProject,
};
