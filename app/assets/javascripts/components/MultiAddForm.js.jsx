class MultiAddForm extends Component {

    static PropTypes = {
        mode:React.PropTypes.string
    };

    render() {
      return (
          <div id="myModal" className="modal fade" role="dialog">
              <div className="modal-dialog">

                  <!-- Modal content -->
                  <div className="modal-content">
                      <div className="modal-header">
                          <button type="button" className="close" data-dismiss="modal">&times;</button>
                          <h4 className="modal-title">Nouveau sujet</h4>
                      </div>
                      <div className="modal-body">

                          <div className="form-group">
                              <label for="usr">Titre :</label>
                              <input type="text" className="form-control" id="usr" />
                          </div>

                          <div className="form-group">
                              <label for="comment">Présentation :</label>
                              <textarea className="form-control" rows="5" id="comment"></textarea>
                          </div>
                          <p>Some text in the modal.</p>
                      </div>

                      <div className="modal-footer">
                          <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                      </div>
                  </div>
              </div>
          </div>
      );
    }
}