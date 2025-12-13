import { useEffect, useState } from 'react';
import { TrainingProgress } from '../utils/api';

interface NeuralNetworkVizProps {
  progress: TrainingProgress | null;
}

interface Node {
  id: string;
  x: number;
  y: number;
  layer: number;
  activation?: number;
}

interface Connection {
  from: string;
  to: string;
  weight?: number;
}

export default function NeuralNetworkViz({ progress }: NeuralNetworkVizProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Define network architecture: 7 inputs -> 64 -> 32 -> 1 output
    const layers = [7, 64, 32, 1];
    const layerSpacing = 200;
    const nodeSpacing = 30;
    const startX = 50;
    const startY = 100;

    const newNodes: Node[] = [];
    const newConnections: Connection[] = [];

    layers.forEach((layerSize, layerIndex) => {
      const x = startX + layerIndex * layerSpacing;
      const totalHeight = (layerSize - 1) * nodeSpacing;
      const startYLayer = startY + (300 - totalHeight) / 2;

      for (let i = 0; i < layerSize; i++) {
        const y = startYLayer + i * nodeSpacing;
        const nodeId = `layer${layerIndex}_node${i}`;
        newNodes.push({
          id: nodeId,
          x,
          y,
          layer: layerIndex,
          activation: progress ? Math.random() * 0.5 + 0.5 : 0,
        });

        // Create connections to next layer
        if (layerIndex < layers.length - 1) {
          const nextLayerSize = layers[layerIndex + 1];
          for (let j = 0; j < nextLayerSize; j++) {
            newConnections.push({
              from: nodeId,
              to: `layer${layerIndex + 1}_node${j}`,
              weight: Math.random() * 0.5 + 0.5,
            });
          }
        }
      }
    });

    setNodes(newNodes);
    setConnections(newConnections);
  }, []);

  useEffect(() => {
    if (progress && progress.status === 'training') {
      setAnimating(true);
      // Simulate activation based on loss (lower loss = higher activation)
      const activationBase = Math.max(0, 1 - progress.loss / 1000);
      
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          activation: activationBase + (Math.random() - 0.5) * 0.3,
        }))
      );

      const timeout = setTimeout(() => setAnimating(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  const getNodeColor = (node: Node) => {
    if (!node.activation) return '#e5e7eb';
    const intensity = Math.min(1, node.activation);
    const opacity = Math.max(0.3, intensity);
    
    if (node.layer === 0) return `rgba(59, 130, 246, ${opacity})`; // Blue for input
    if (node.layer === 1) return `rgba(139, 92, 246, ${opacity})`; // Purple for hidden 1
    if (node.layer === 2) return `rgba(16, 185, 129, ${opacity})`; // Green for hidden 2
    return `rgba(245, 158, 11, ${opacity})`; // Orange for output
  };

  const getConnectionOpacity = (conn: Connection) => {
    if (!animating) return 0.1;
    return Math.max(0.1, Math.min(0.6, (conn.weight || 0.5)));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Визуализация нейронной сети</h3>
      <div className="relative" style={{ width: '100%', height: '400px', overflow: 'visible' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 400" className="overflow-visible">
          {/* Connections */}
          {connections.map((conn, idx) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={idx}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#9ca3af"
                strokeWidth={1}
                opacity={getConnectionOpacity(conn)}
                className={animating ? 'transition-opacity duration-300' : ''}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.layer === 0 ? 8 : node.layer === nodes[nodes.length - 1].layer ? 10 : 6}
                fill={getNodeColor(node)}
                stroke="#374151"
                strokeWidth={1.5}
                className={animating ? 'transition-all duration-300' : ''}
              />
              {node.layer === 0 && (
                <text
                  x={node.x}
                  y={node.y - 15}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="10"
                >
                  {['P', 'Q', 'H', 'W', 'G', 'O', 'C'][node.id.split('_')[1]?.replace('node', '') || 0]}
                </text>
              )}
            </g>
          ))}

          {/* Layer labels */}
          <text x={50} y={50} className="text-sm font-semibold fill-gray-700">Вход (7)</text>
          <text x={250} y={50} className="text-sm font-semibold fill-gray-700">Скрытый 1 (64)</text>
          <text x={450} y={50} className="text-sm font-semibold fill-gray-700">Скрытый 2 (32)</text>
          <text x={650} y={50} className="text-sm font-semibold fill-gray-700">Выход (1)</text>
        </svg>
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center">
        {progress?.status === 'training' ? (
          <span className="text-indigo-600">🔄 Обучение в процессе...</span>
        ) : progress?.status === 'completed' ? (
          <span className="text-green-600">✓ Обучение завершено</span>
        ) : (
          <span>Ожидание начала обучения</span>
        )}
      </div>
    </div>
  );
}








