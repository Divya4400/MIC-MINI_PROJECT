"""
This is where the implementation of the plugin code goes.
The PNPlugin-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
from webgme_bindings import PluginBase

# Setup a logger
logger = logging.getLogger('PNPlugin')

logger.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..

handler.setLevel(logging.INFO)

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

handler.setFormatter(formatter)

logger.addHandler(handler)


class PNPlugin(PluginBase):
    def main(self):
        core = self.core
        root_node = self.root_node
        META = self.META
        active_node = self.active_node

        #assigned visited as set
        visited = set()
        #assigned states as set
        states = set()
        #defined graph
        graph = {}

        # building simple graph representation possible
        nodes = core.load_children(active_node)
        #for states
        for node in nodes:
            if core.is_type_of(node, META['States']):
                states.add(core.get_path(node))
            if core.is_type_of(node, META['Init']):
                visited.add(core.get_path(node))
        
        #for transition
        for node in nodes:
            if core.is_type_of(node, META['Transition']):
                if core.get_pointer_path(node, 'src') in graph:
                    graph[core.get_pointer_path(node, 'src')].append(core.get_pointer_path(node, 'dst'))
                else:
                    graph[core.get_pointer_path(node, 'src')] = [core.get_pointer_path(node, 'dst')]
        
        #updating the visited set
        osize = len(visited) #for old size
        nsize = 0           #for new size


        while osize != nsize:
            osize = len(visited)
            elements = list(visited)
            for element in elements:
                if element in graph:
                    for next_state in graph[element]:
                        visited.add(next_state)
            nsize = len(visited)
        
        #checking difference between the full set of states and the reachable ones
        if len(states.difference(visited)) == 0:

            # if its good
            self.send_notification('Your states machine is in good condition')
        else:
            #if states that are unreachable
            self.send_notification('Your states machine has unreachable states')
            

