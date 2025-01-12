/*
*  Alerts © 2022
*  Author:  Ameen Ahmed
*  Company: Level Up Marketing & Software Development Services
*  Licence: Please refer to LICENSE file
*/


frappe.ui.form.on('Alert', {
    setup: function(frm) {
        frm.A = {
            is_draft: cint(frm.doc.docstatus) == 0,
            is_submitted: cint(frm.doc.docstatus) == 1,
            is_cancelled: cint(frm.doc.docstatus) == 2,
            today: moment(),
            tomorrow: moment().add(1, 'days'),
        };
    },
    onload: function(frm) {
        if (!frm.A.is_draft) {
            frm.disable_form();
            frm.set_intro(
                __(
                    '{0} has been {1}',
                    [
                        frm.doctype,
                        frm.A.is_submitted ? 'submitted' : 'cancelled'
                    ]
                ),
                frm.A.is_submitted ? 'green' : 'red'
            );
            
            frm.set_df_property('seen_by', 'cannot_add_rows', 1);
            frm.set_df_property('seen_by', 'cannot_delete_rows', 1);
            var seen_by_grid = frm.get_field('seen_by').grid;
            if (seen_by_grid.meta) seen_by_grid.meta.editable_grid = true;
            seen_by_grid.only_sortable();
            
            frappe.socketio.init();
            frappe.realtime.on('refresh_alert_seen_by', function() {
                frm.reload_doc();
            });
            return;
        }
        
        frm.set_query('alert_type', {filters: {disabled: 0}});
        
        frm.add_fetch('alert_type', 'title', 'title', frm.doctype);
        
        frm.set_query('role', 'for_roles', function(doc, cdt, cdn) {
            var qry = {
                filters: {disabled: 0, desk_access: 1}
            };
            if (frm.doc.for_roles.length) {
                qry.filters.name = ['notin', []];
                $.each(frm.doc.for_roles, function(i, v) {
                    qry.filters.name[1].push(v.role);
                });
            }
            return qry;
        });
        frm.set_query('user', 'for_users', function(doc, cdt, cdn) {
            var qry = {
                query: 'alerts.utils.search_users'
            };
            if (frm.doc.for_users.length) {
                qry.filters = {existing: []};
                $.each(frm.doc.for_users, function(i, v) {
                    qry.filters.existing.push(v.user);
                });
            }
            return qry;
        });
        
        var today = frappe.datetime.moment_to_date_obj(frm.A.today),
        tomorrow = frappe.datetime.moment_to_date_obj(frm.A.tomorrow);
        frm.set_df_property('from_date', 'options', {
            startDate: today,
            minDate: today
        });
        frm.set_df_property('until_date', 'options', {
            startDate: tomorrow,
            minDate: tomorrow
        });
    },
    from_date: function(frm) {
        frm.trigger('validate_from_date');
    },
    until_date: function(frm) {
        frm.trigger('validate_until_date');
    },
    validate: function(frm) {
        frm.trigger('validate_from_date');
        frm.trigger('validate_until_date');
        if (!frm.doc.for_roles.length && !frm.doc.for_users.length) {
            frappe.throw(__('Please select at least one recipient role or user'));
        }
    },
    validate_from_date: function(frm) {
        if (!frm.doc.from_date) return;
        if (
            frm.A.today.diff(moment(
                frm.doc.from_date,
                frappe.defaultDateFormat
            ), 'days') > 0
        ) {
            frm.set_value('from_date', frm.A.today.format());
            return;
        }
        if (!frm.doc.until_date) return;
        var until_date = moment(
            frm.doc.until_date,
            frappe.defaultDateFormat
        );
        if (
            moment(
                frm.doc.from_date,
                frappe.defaultDateFormat
            ).diff(until_date, 'days') >= 0
        ) {
            frm.set_value('from_date', until_date.add(-1, 'days').format());
        }
    },
    validate_until_date: function(frm) {
        if (!frm.doc.until_date) return;
        if (
            frm.A.tomorrow.diff(moment(
                frm.doc.until_date,
                frappe.defaultDateFormat
            ), 'days') > 0
        ) {
            frm.set_value('until_date', frm.A.tomorrow.format());
            return;
        }
        if (!frm.doc.from_date) return;
        var from_date = moment(
            frm.doc.from_date,
            frappe.defaultDateFormat
        );
        if (
            from_date.diff(
                moment(
                    frm.doc.until_date,
                    frappe.defaultDateFormat
                ),
                'days'
            ) >= 0
        ) {
            frm.set_value('until_date', from_date.add(1, 'days').format());
        }
    },
});