import styles from './last-statements.module.css'

export default function LastStatements() {
  const statements = [
    {
      id: '1',
      publicFigureName: 'Marine Le Pen',
      position: 'Sortie de l\'Europe',
      subject: 'Sortie de la zone Euro'
    },
    {
      id: '2', 
      publicFigureName: 'Marine Le Pen',
      position: 'Sortie de l\'Europe',
      subject: 'Sortie de la zone Euro'
    },
    {
      id: '3',
      publicFigureName: 'Marine Le Pen', 
      position: 'Sortie de l\'Europe',
      subject: 'Sortie de la zone Euro'
    },
    {
      id: '4',
      publicFigureName: 'Marine Le Pen',
      position: 'Sortie de l\'Europe', 
      subject: 'Sortie de la zone Euro'
    }
  ]
  
  return (
    <div className={styles.lastStatements}>
      <h2 className={styles.title}>LES DERNIÈRES PRISES DE POSITION</h2>
      <ul className={styles.statementsList}>
        {statements.map(statement => (
          <li key={statement.id} className={styles.statementItem}>
            <div className={styles.avatar}></div>
            <div className={styles.statementContent}>
              <div className={styles.publicFigureText}>
                <strong>{statement.publicFigureName}</strong> s&apos;est déclarée pour <strong>{statement.position}</strong> dans le débat sur <strong>{statement.subject}</strong>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
