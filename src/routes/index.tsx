import type { Connection, Edge, Node, NodeProps } from '@xyflow/react'
import { createFileRoute } from '@tanstack/react-router'
import {
  addEdge,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { MessageCircle, X } from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import '@xyflow/react/dist/style.css'

export const Route = createFileRoute('/')({
  component: App,
})

// Default nodes - only used for initial state
const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'messageNode',
    position: { x: 250, y: 50 },
    data: { message: 'Hello! Welcome to our Bitespeed.' },
  },
]

// Atoms for persisting state
const nodesAtom = atomWithStorage<Node[]>('chatbot-nodes', defaultNodes)
const edgesAtom = atomWithStorage<Edge[]>('chatbot-edges', [])
const nodeCounterAtom = atomWithStorage('chatbot-node-counter', 2)

// Custom Message Node Component
function MessageNode({ data, isConnectable }: NodeProps) {
  return (
    <div className="px-3 py-2 shadow-sm rounded-lg bg-card border-2 border-border min-w-[160px] sm:min-w-[200px] max-w-[200px] sm:max-w-none">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 sm:w-4 sm:h-4 !bg-primary"
      />
      <div className="flex flex-col">
        <div className="text-sm sm:text-lg font-bold text-card-foreground flex items-center gap-1 sm:gap-2">
          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="truncate">Send Message</span>
        </div>
        <div className="text-muted-foreground text-xs sm:text-sm mt-1 break-words">
          {String(data.message)}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 sm:w-4 sm:h-4 !bg-primary"
      />
    </div>
  )
}

const nodeTypes = {
  messageNode: MessageNode,
}

function App() {
  // Get persisted state from atoms
  const [persistedNodes, setPersistedNodes] = useAtom(nodesAtom)
  const [persistedEdges, setPersistedEdges] = useAtom(edgesAtom)
  const [nodeIdCounter, setNodeIdCounter] = useAtom(nodeCounterAtom)

  // Use React Flow's hooks - initialize with persisted data!
  const [nodes, setNodes, onNodesChange] = useNodesState(persistedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(persistedEdges)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sync React Flow state with persisted atoms when they change
  useEffect(() => {
    setNodes(persistedNodes)
  }, [persistedNodes, setNodes])

  useEffect(() => {
    setEdges(persistedEdges)
  }, [persistedEdges, setEdges])

  // Sync to localStorage when nodes change
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
      setTimeout(() => {
        setNodes((currentNodes) => {
          setPersistedNodes(currentNodes)
          return currentNodes
        })
      }, 0)
    },
    [onNodesChange, setNodes, setPersistedNodes],
  )

  // Sync to localStorage when edges change
  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
      setTimeout(() => {
        setEdges((currentEdges) => {
          setPersistedEdges(currentEdges)
          return currentEdges
        })
      }, 0)
    },
    [onEdgesChange, setEdges, setPersistedEdges],
  )

  // Helper function to detect if adding a connection would create a cycle
  const wouldCreateCycle = useCallback(
    (sourceId: string, targetId: string): boolean => {
      const visited = new Set<string>()

      const hasPath = (from: string, to: string): boolean => {
        if (from === to) return true
        if (visited.has(from)) return false

        visited.add(from)

        const outgoingEdges = edges.filter((edge) => edge.source === from)

        for (const edge of outgoingEdges) {
          if (hasPath(edge.target, to)) {
            return true
          }
        }

        return false
      }

      return hasPath(targetId, sourceId)
    },
    [edges],
  )

  // Helper function to check if all nodes are connected (no isolated nodes)
  const areAllNodesConnected = useCallback(() => {
    if (nodes.length <= 1) return true

    const connectedNodeIds = new Set<string>()

    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    return nodes.every((node) => connectedNodeIds.has(node.id))
  }, [nodes, edges])

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return

      if (params.source === params.target) {
        toast('Cannot connect a node to itself!')
        return
      }

      const sourceHasEdge = edges.some(
        (edge) =>
          edge.source === params.source &&
          edge.sourceHandle === params.sourceHandle,
      )

      if (sourceHasEdge) {
        toast('Source handle can only have one outgoing connection!')
        return
      }

      if (wouldCreateCycle(params.source, params.target)) {
        toast(
          'Cannot create circular connections! Chatbot flows must be linear.',
        )
        return
      }

      const newEdges = addEdge(params, edges)
      setEdges(newEdges)
      setPersistedEdges(newEdges)
    },
    [edges, setEdges, setPersistedEdges, wouldCreateCycle],
  )

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null) // Clear edge selection
    setMessageText((node.data.message as string) || '')
    setShowSettings(true)
  }, [])

  // Handle edge click for selection and deletion
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    setSelectedEdgeId(edge.id)
    setSelectedNodeId(null) // Clear node selection
    // toast(
    //   'Edge selected. Press Delete key or use the delete button to disconnect.',
    // )
  }, [])

  // Delete selected edge
  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return

    const newEdges = edges.filter((edge) => edge.id !== selectedEdgeId)
    setEdges(newEdges)
    setPersistedEdges(newEdges)
    setSelectedEdgeId(null)
    toast('Connection removed!')
  }, [selectedEdgeId, edges, setEdges, setPersistedEdges])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedEdgeId) {
        deleteSelectedEdge()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdgeId, deleteSelectedEdge])

  const createMessageNode = () => {
    if (!messageText.trim()) return

    const newNode: Node = {
      id: nodeIdCounter.toString(),
      type: 'messageNode',
      position: { x: Math.random() * 300 + 50, y: Math.random() * 300 + 50 },
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

    const newNodes = nodes.filter((node) => node.id !== selectedNodeId)
    setNodes(newNodes)
    setPersistedNodes(newNodes)

    const newEdges = edges.filter(
      (edge) =>
        edge.source !== selectedNodeId && edge.target !== selectedNodeId,
    )
    setEdges(newEdges)
    setPersistedEdges(newEdges)

    setSelectedNodeId(null)
    setShowSettings(false)
    setMessageText('')
  }

  const handleClearAll = () => {
    setNodes(defaultNodes)
    setEdges([])
    setPersistedNodes(defaultNodes)
    setPersistedEdges([])
    setNodeIdCounter(2)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setShowSettings(false)
    setMessageText('')
  }

  const saveChanges = () => {
    if (!areAllNodesConnected()) {
      toast('Cannot save! All nodes must be connected to the flow.')
      return
    }

    toast('Flow saved successfully! All nodes are properly connected.')
  }

  const canSave = areAllNodesConnected()

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center shadow-sm lg:hidden">
        <h1 className="text-lg sm:text-xl font-semibold text-card-foreground">
          Chatbot Flow Builder
        </h1>
        <div className="flex gap-1 sm:gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" >
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="mx-4 max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Nodes?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset the flow to the default welcome message.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={saveChanges}
            disabled={!canSave}
            variant={canSave ? 'default' : 'secondary'}
            
          >
            Save
          </Button>
        </div>
      </div>

      {/* Main Flow Area */}
      <div className="flex-1 flex flex-col">
        {/* Desktop Header */}
        <div className="hidden lg:flex bg-card border-b border-border px-4 py-3 justify-between items-center shadow-sm">
          <h1 className="text-xl font-semibold text-card-foreground">
            Chatbot Flow Builder
          </h1>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Clear All</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Nodes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will reset the flow to
                    the default welcome message.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={saveChanges}
              disabled={!canSave}
              variant={canSave ? 'default' : 'secondary'}
            >
              Save Changes
            </Button>
          </div>
        </div>

        {/* React Flow */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges.map((edge) => ({
              ...edge,
              style: {
                stroke: selectedEdgeId === edge.id ? '#ef4444' : '#6b7280',
                strokeWidth: selectedEdgeId === edge.id ? 3 : 2,
              },
            }))}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={() => {
              setSelectedNodeId(null)
              setSelectedEdgeId(null)
            }}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
            className="bg-muted/20"
            minZoom={0.1}
            maxZoom={2}
          >
            <Controls className="bg-card border-border" />
            <Background
              variant="dots"
              gap={12}
              size={1}
              className="opacity-30"
            />
          </ReactFlow>

          {/* Edge Delete Button for Mobile */}
          {(selectedEdgeId && isMobile) ? (
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={deleteSelectedEdge}
                variant="destructive"
                
                className="shadow-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Settings Panel */}
      <div className="w-full lg:w-80 bg-card border-t lg:border-t-0 lg:border-l border-border">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
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
                <CardContent className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 p-3 sm:p-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {selectedNodeId ? 'Edit Message' : 'Enter Message Text'}
                    </label>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message here..."
                      className="resize-none h-20 sm:h-24 text-sm"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    {selectedNodeId ? (
                      <>
                        <Button
                          onClick={updateSelectedNode}
                          className="flex-1"
                          disabled={!messageText.trim()}
                         
                        >
                          Update Node
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                             
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 max-w-sm lg:max-w-lg lg:mx-0">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Node?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete this node and all its
                                connections.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={deleteSelectedNode}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Node
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Instructions:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Click "Message" to create new nodes</li>
                    <li>Click on a node to edit its message</li>
                    <li>Drag between handles to connect nodes</li>
                    <li>Click on a connection line to select it</li>
                    <li>
                      Press Delete key {isMobile ? 'or tap X button ' : ''}to
                      disconnect
                    </li>
                    <li>Source handles can only have one outgoing edge</li>
                    <li>Circular connections are not allowed</li>
                    <li>All nodes must be connected to save</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {selectedEdgeId ? (
              <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <CardContent className="pt-4 p-3 sm:p-6">
                  <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                    <p>
                      <strong>Connection Selected</strong>
                    </p>
                    <p>
                      Press Delete key {isMobile ? 'or tap the X button ' : ''}
                      to disconnect the nodes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {(!canSave && nodes.length > 1) ? (
              <Card className="bg-destructive/10 border-destructive/20">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="text-xs sm:text-sm text-destructive">
                    <p>
                      <strong>Warning:</strong> Some nodes are not connected to
                      the flow.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ):null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
