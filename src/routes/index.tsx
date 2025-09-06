import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle } from 'lucide-react'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const Route = createFileRoute('/')({
  component: App,
})

// Atoms for persisting state
const nodesAtom = atomWithStorage<Node[]>('chatbot-nodes', [
  {
    id: '1',
    type: 'messageNode',
    position: { x: 250, y: 50 },
    data: { message: 'Hello! Welcome to our Bitespeed.' },
  },
])

const edgesAtom = atomWithStorage<Edge[]>('chatbot-edges', [])

const nodeCounterAtom = atomWithStorage('chatbot-node-counter', 2)

// Custom Message Node Component
function MessageNode({ data, isConnectable }: NodeProps) {
  return (
    <div className="px-4 py-2 shadow-sm rounded-lg bg-card border-2 border-border min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-16 !bg-primary"
      />
      <div className="flex flex-col">
        <div className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Send Message
        </div>
        <div className="text-muted-foreground text-sm mt-1">{data.message}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-16 !bg-primary"
      />
    </div>
  )
}

const nodeTypes = {
  messageNode: MessageNode,
}

function App() {
  const [persistedNodes, setPersistedNodes] = useAtom(nodesAtom)
  const [persistedEdges, setPersistedEdges] = useAtom(edgesAtom)
  const [nodeIdCounter, setNodeIdCounter] = useAtom(nodeCounterAtom)
  
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Initialize React Flow state from persisted atoms
  useEffect(() => {
    setNodes(persistedNodes)
    setEdges(persistedEdges)
  }, [persistedNodes, persistedEdges, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      // Prevent self-connection
      if (params.source === params.target) {
        alert('Cannot connect a node to itself!')
        return
      }

      // Check if source handle already has an edge
      const sourceHasEdge = edges.some(
        (edge) =>
          edge.source === params.source &&
          edge.sourceHandle === params.sourceHandle,
      )

      if (sourceHasEdge) {
        alert('Source handle can only have one outgoing connection!')
        return
      }

      const newEdges = addEdge(params, edges)
      setEdges(newEdges)
      setPersistedEdges(newEdges)
    },
    [edges, setEdges, setPersistedEdges],
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    setMessageText(node.data.message || '')
    setShowSettings(true)
  }, [])

  const createMessageNode = () => {
    if (!messageText.trim()) return

    const newNode: Node = {
      id: nodeIdCounter.toString(),
      type: 'messageNode',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: { message: messageText },
    }

    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    setPersistedNodes(newNodes)
    setNodeIdCounter((prev) => prev + 1)
    setMessageText('')
  }

  const updateSelectedNode = () => {
    if (!selectedNodeId || !messageText.trim()) return

    const newNodes = nodes.map((node) =>
      node.id === selectedNodeId
        ? { ...node, data: { ...node.data, message: messageText } }
        : node,
    )
    
    setNodes(newNodes)
    setPersistedNodes(newNodes)
    setMessageText('')
    setSelectedNodeId(null)
    setShowSettings(false)
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return

    // Remove the node
    const newNodes = nodes.filter(node => node.id !== selectedNodeId)
    setNodes(newNodes)
    setPersistedNodes(newNodes)

    // Remove all edges connected to this node
    const newEdges = edges.filter(edge => 
      edge.source !== selectedNodeId && edge.target !== selectedNodeId
    )
    setEdges(newEdges)
    setPersistedEdges(newEdges)

    setSelectedNodeId(null)
    setShowSettings(false)
    setMessageText('')
  }

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all nodes and connections?')) {
      setNodes([])
      setEdges([])
      setPersistedNodes([])
      setPersistedEdges([])
      setNodeIdCounter(1)
      setSelectedNodeId(null)
      setShowSettings(false)
      setMessageText('')
    }
  }

  const saveChanges = () => {
    // Currently does nothing as specified
    alert('Save changes clicked - currently does nothing')
  }

  // Custom onChange handlers that sync to localStorage
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes)
    // Get the updated nodes after the change and persist them
    setNodes((currentNodes) => {
      setPersistedNodes(currentNodes)
      return currentNodes
    })
  }, [onNodesChange, setPersistedNodes, setNodes])

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes)
    // Get the updated edges after the change and persist them
    setEdges((currentEdges) => {
      setPersistedEdges(currentEdges)
      return currentEdges
    })
  }, [onEdgesChange, setPersistedEdges, setEdges])

  return (
    <div className="w-full h-screen flex bg-background">
      {/* Main Flow Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-semibold text-card-foreground">
            Chatbot Flow Builder
          </h1>
          <div className="flex gap-2">
            <Button onClick={clearAll} variant="outline" size="sm">
              Clear All
            </Button>
            <Button onClick={saveChanges}>Save Changes</Button>
          </div>
        </div>

        {/* React Flow */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20"
          >
            <Controls className="bg-card border-border" />
            <MiniMap className="bg-card border-border" />
            <Background variant="dots" gap={12} size={1} className="opacity-30" />
          </ReactFlow>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-80">
        <Card className="h-full rounded-none border-l border-t-0 border-r-0 border-b-0">
          <CardHeader>
            <CardTitle>Settings Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="secondary"
                className="w-full"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </Button>
            </div>

            {showSettings ? (
              <Card className="bg-muted/50">
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {selectedNodeId ? 'Edit Message' : 'Enter Message Text'}
                    </label>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message here..."
                      className="resize-none h-24"
                    />
                  </div>

                  <div className="flex gap-2">
                    {selectedNodeId ? (
                      <>
                        <Button
                          onClick={updateSelectedNode}
                          className="flex-1"
                          disabled={!messageText.trim()}
                        >
                          Update Node
                        </Button>
                        <Button
                          onClick={deleteSelectedNode}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={createMessageNode}
                        className="flex-1"
                        disabled={!messageText.trim()}
                      >
                        Create Node
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setShowSettings(false)
                        setSelectedNodeId(null)
                        setMessageText('')
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Instructions:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Click "Message" to create new nodes</li>
                    <li>Click on a node to edit its message</li>
                    <li>Drag between handles to connect nodes</li>
                    <li>Source handles (bottom) can only have one outgoing edge</li>
                    <li>Target handles (top) can have multiple incoming edges</li>
                    <li>Nodes cannot connect to themselves</li>
                    <li>All changes are automatically saved to localStorage</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {nodes.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Stats:</strong></p>
                    <p>Nodes: {nodes.length}</p>
                    <p>Connections: {edges.length}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
