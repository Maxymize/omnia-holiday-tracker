# 🧠 Context Management Guide

## 🎯 Context Optimization Strategy

### **Problem Solved**
- **Before**: TASK.md was 1,561 lines causing rapid context depletion
- **After**: TASK.md optimized to ~123 lines focusing on active work only

### **File Structure Optimization**

#### **Priority Files (Read Every Session)**:
1. **CLAUDE.md** - Primary control center (~495 lines)
2. **TASK.md** - Active tasks only (~123 lines) ⭐ **OPTIMIZED**
3. **STATUS-HANDOFF.md** - Current state (~56 lines)
4. **AGENT-WORK-LOG.md** - Recent work log (~69 lines)

**Total Core Reading**: ~743 lines (vs previous 1,561+ lines)
**Context Savings**: ~50% reduction in mandatory reading

#### **Reference Files (Read When Needed)**:
- **TASK-COMPLETED.md** - Completed work archive (~233 lines)
- **PLANNING.md** - Full architecture (~383 lines)  
- **CLAUDE-CODE-INSTRUCTIONS.md** - Detailed procedures (~136 lines)
- **DOMAIN-CONFIG.md** - Domain configuration (~41 lines)
- **README.md** - Project overview (~221 lines)

### **Context Usage Guidelines**

#### **For Claude Code - Session Management**:

**🔄 Every Session Start**:
1. Read core files only (CLAUDE.md → TASK.md → STATUS-HANDOFF.md)
2. Check AGENT-WORK-LOG.md for recent changes
3. Reference other files only when specifically needed

**📝 During Development**:
- Focus on one task at a time from TASK.md
- Read specific code files in sections, not entirely
- Use TodoWrite for state updates instead of long documentation

**🤖 Agent Handoffs**:
- Keep handoff documentation concise but complete
- Update TASK.md with brief status, detailed work in AGENT-WORK-LOG.md
- Archive completed work immediately to TASK-COMPLETED.md

#### **Context Warning Levels**:

**🟢 Green (>50% context)**: Normal operation, read files as needed
**🟡 Yellow (20-50% context)**: 
- Read only essential sections of files
- Avoid re-reading large files
- Focus on current task completion

**🔴 Red (<20% context)**: 
- Read only TASK.md and STATUS-HANDOFF.md
- Complete current task before context expires
- Prepare handoff documentation for next session

### **File Maintenance Rules**

#### **TASK.md Maintenance**:
- ✅ Keep only active/in-progress tasks
- ✅ Move completed tasks to TASK-COMPLETED.md immediately  
- ✅ Maximum recommended size: 150 lines
- ✅ Archive old phases when entering new ones

#### **AGENT-WORK-LOG.md Maintenance**:
- ✅ Keep only recent work entries (last 10-15 entries)
- ✅ Archive older entries monthly
- ✅ Focus on essential information only

#### **Documentation Updates**:
- ✅ Update only what changed, not entire sections
- ✅ Use concise language and bullet points
- ✅ Link to reference files instead of duplicating content

### **Context Monitoring**

#### **Warning Signs of Context Issues**:
- Context warnings appearing before 10 interactions
- Need to re-read the same large files repeatedly
- Long documentation updates consuming significant context

#### **Preventive Measures**:
- Regular file size monitoring (use wc -l filename)
- Proactive archiving of completed work
- Modular file structure with clear separation of concerns

### **Emergency Context Recovery**

If context becomes critically low mid-session:

1. **Complete Current Task**: Finish what you're working on
2. **Document State**: Update STATUS-HANDOFF.md with current progress
3. **Archive Work**: Move any completed items to archives
4. **Prepare Handoff**: Create clear handoff for next session

### **Success Metrics**

**Target Context Duration**: 15-20 interactions per session (vs previous 6-8)
**File Size Targets**:
- TASK.md: <150 lines
- AGENT-WORK-LOG.md: <100 lines  
- STATUS-HANDOFF.md: <60 lines

**Context Health Indicators**:
- ✅ Can complete 2-3 substantial tasks per session
- ✅ Can use agents multiple times without context warnings
- ✅ Can read reference files when needed without depletion

This optimization should significantly improve Claude Code's operational efficiency and reduce context-related interruptions.
